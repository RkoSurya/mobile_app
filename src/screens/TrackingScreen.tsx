import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  PermissionsAndroid,
  AppState,
  AppStateStatus,
} from 'react-native';
import Geolocation, { GeolocationResponse, GeolocationError } from '@react-native-community/geolocation';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NavigationProp, RootStackParamList } from '../types/navigation';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import { addLocationData } from '../services/firestoreService';
import DeviceInfo from 'react-native-device-info';
import BackgroundTimer from 'react-native-background-timer';
import auth from '@react-native-firebase/auth';

// Configure geolocation with better settings
Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto'
});

export interface Location {
  latitude: number;
  longitude: number;
}

const TrackingScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'Tracking'>>();
  const shouldResume = route.params?.shouldResume;
  const [isTracking, setIsTracking] = useState(() => route.params?.shouldResume || false);
  const isTrackingRef = useRef(route.params?.shouldResume || false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationHistory, setLocationHistory] = useState<Location[]>([]);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [distance, setDistance] = useState(0);
  const [time, setTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<number | null>(null);
  const [firestoreInterval, setFirestoreInterval] = useState<number | null>(null);
  const appState = useRef(AppState.currentState);

  const requestAndroidPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const checkLocationPermission = async () => {
    if (Platform.OS === 'android') {
      return await requestAndroidPermission();
    }
    return true;
  };

  const getCurrentLocation = () => {
    const handleLocationError = (error: GeolocationError) => {
      console.log('Location error:', error);
      let message = 'An unknown error occurred while getting your location.';
      
      switch (error.code) {
        case 1: // PERMISSION_DENIED
          message = 'Location permission was denied. Please enable location services to use this feature.';
          break;
        case 2: // POSITION_UNAVAILABLE
          message = 'Location information is currently unavailable. Please try again in a few moments.';
          break;
        case 3: // TIMEOUT
          message = 'Location request timed out. Please check your internet connection and try again.';
          break;
        case 4: // ACTIVITY_NULL
          message = 'Location services are not active. Please enable location services and try again.';
          break;
      }

      Alert.alert(
        'Location Error',
        message,
        [
          { text: 'Try Again', onPress: () => getCurrentLocation() },
          { text: 'Open Settings', onPress: () => openSettings() }
        ]
      );
    };

    Geolocation.getCurrentPosition(
      (position) => {
        console.log('Location retrieved:', position);
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
      },
      (error) => {
        // If high accuracy fails with timeout, retry with lower accuracy
        if (error.code === 3) {
          Geolocation.getCurrentPosition(
            (position) => {
              console.log('Location retrieved with low accuracy:', position);
              const { latitude, longitude } = position.coords;
              setCurrentLocation({ latitude, longitude });
            },
            handleLocationError,
            {
              enableHighAccuracy: false,
              timeout: 20000,
              maximumAge: 30000
            }
          );
        } else {
          handleLocationError(error);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
        distanceFilter: 10
      }
    );
  };

  const stopTracking = () => {
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    if (timerInterval) {
      BackgroundTimer.clearInterval(timerInterval);
      setTimerInterval(null);
    }
    // Clear any pending geolocation requests
    Geolocation.stopObserving();
  };

  const handleShopReached = () => {
    // Keep tracking active but pause location updates
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    // Keep tracking state true so timer continues
    isTrackingRef.current = true;
    setIsTracking(true);

    // Navigate to nearby shops
    navigation.navigate('NearbyShops', {
      currentLocation: currentLocation ? {
        coords: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          altitude: null,
          accuracy: 0,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now()
      } : null,
      distance: distance,
      time: time
    });
  };

  const stopLocationTracking = () => {
    // Clear watch
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    // Stop all observers
    Geolocation.stopObserving();
  };

  const handleEndDayOnTracking = async () => {
    console.log('Ending day on Tracking page - Starting cleanup');
    
    // Immediately prevent new updates
    isTrackingRef.current = false;
    setIsTracking(false);
    
    try {
      // 1. Stop location tracking first to prevent any new updates
      stopLocationTracking();
      
      // 2. Stop Firestore updates
      stopFirestoreUpdates();
      
      // 3. Stop timer
      if (timerInterval) {
        BackgroundTimer.clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      // 4. Reset all states
      setIsPaused(false);
      setCurrentLocation(null);
      setLocationHistory([]);
      setDistance(0);
      setTime(0);
      
      // 5. Final cleanup
      BackgroundTimer.stopBackgroundTimer();
      
      // 6. Double check location tracking is stopped
      stopLocationTracking();
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('All tracking processes stopped successfully');
      
      // Final check before navigation
      stopLocationTracking();
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error during cleanup:', error);
      // Ensure location is stopped even on error
      stopLocationTracking();
      navigation.navigate('Home');
    }
  };

  const requestLocationPermission = async () => {
    const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    if (result !== RESULTS.GRANTED) {
      const requestResult = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      if (requestResult !== RESULTS.GRANTED) {
        Alert.alert('Permission Required', 'Location permission is needed to access your current location.');
      }
    }
  };

  const checkLocationServices = async () => {
    const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    if (result !== RESULTS.GRANTED) {
      Alert.alert(
        'Location Services Disabled',
        'Please enable location services to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: () => openSettings() },
        ]
      );
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('App has come to the foreground!');
    }
    appState.current = nextAppState;
  };

  const startTimer = () => {
    // Clear any existing timer
    if (timerInterval) {
      BackgroundTimer.clearInterval(timerInterval);
    }
    
    // Start a new timer that works in background
    const newInterval = BackgroundTimer.setInterval(() => {
      setTime(prevTime => prevTime + 1);
    }, 1000);
    
    setTimerInterval(newInterval);
  };

  const stopTimer = () => {
    if (timerInterval) {
      BackgroundTimer.clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const pauseTimer = () => {
    if (timerInterval) {
      BackgroundTimer.clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const resumeTimer = () => {
    startTimer();
  };

  const getLocationWithRetry = async (retryCount = 3): Promise<GeolocationResponse> => {
    return new Promise((resolve, reject) => {
      const tryGetLocation = (attemptsLeft: number) => {
        Geolocation.getCurrentPosition(
          (position) => {
            resolve(position);
          },
          (error) => {
            console.log(`Location attempt failed, ${attemptsLeft} attempts left:`, error);
            if (attemptsLeft > 0) {
              // Retry with lower accuracy if we have attempts left
              Geolocation.getCurrentPosition(
                (position) => {
                  resolve(position);
                },
                (retryError) => {
                  if (attemptsLeft > 1) {
                    setTimeout(() => tryGetLocation(attemptsLeft - 1), 2000);
                  } else {
                    reject(retryError);
                  }
                },
                {
                  enableHighAccuracy: false,
                  timeout: 30000,
                  maximumAge: 60000,
                  distanceFilter: 10
                }
              );
            } else {
              reject(error);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 30000,
            distanceFilter: 5
          }
        );
      };

      tryGetLocation(retryCount);
    });
  };

  const startFirestoreUpdates = () => {
    console.log('Starting Firestore updates');
    // Clear any existing interval first
    stopFirestoreUpdates();

    // Set interval to exactly 1 minute (60000 ms)
    const newInterval = BackgroundTimer.setInterval(async () => {
      // Immediately exit if tracking is stopped
      if (!isTrackingRef.current) {
        console.log('Tracking stopped, clearing Firestore interval');
        stopFirestoreUpdates();
        return;
      }
      
      try {
        // Get location with retry mechanism
        const position = await getLocationWithRetry();
        const { latitude, longitude, accuracy } = position.coords;
        const batteryLevel = await DeviceInfo.getBatteryLevel();
        
        // Double check tracking state before update
        if (!isTrackingRef.current) {
          console.log('Tracking stopped before Firestore update, skipping');
          stopFirestoreUpdates();
          return;
        }

        console.log("Updating Firestore - 1 minute interval");
        const currentUser = auth().currentUser;
        if (!currentUser?.uid) {
          console.log('No user ID found, skipping Firestore update');
          return;
        }
        await addLocationData(currentUser.uid, 'your_journey_id', {
          latitude,
          longitude,
          accuracy,
          batteryLevel,
          eventType: 'day_tracking',
          timestamp: new Date().toISOString()
        });
        console.log("Firestore update successful");
      } catch (error) {
        console.log("Error updating Firestore:", error);
      }
    }, 60000);

    setFirestoreInterval(newInterval);
  };

  const stopFirestoreUpdates = () => {
    console.log('Stopping Firestore updates');
    // Clear the interval using both the ref and the stored interval
    if (firestoreInterval) {
      console.log('Clearing interval:', firestoreInterval);
      BackgroundTimer.clearInterval(firestoreInterval);
      setFirestoreInterval(null);
    }
    
    // Force clear all intervals as a safety measure
    BackgroundTimer.stopBackgroundTimer();
    console.log('All background timers stopped');
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isTracking && !isPaused) {
      startTimer();
    } else {
      stopTimer();
    }

    return () => {
      if (timerInterval) {
        BackgroundTimer.clearInterval(timerInterval);
      }
    };
  }, [isTracking, isPaused]);

  useEffect(() => {
    console.log('TrackingScreen mounted with shouldResume:', shouldResume);
    if (shouldResume) {
      setIsTracking(true);
    } else {
      setIsTracking(false);
      if (timerInterval) {
        BackgroundTimer.clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  }, [shouldResume]);

  useEffect(() => {
    console.log('isTracking state changed:', isTracking);
    if (isTracking) {
      // Start watching position for UI updates with more lenient settings
      const watchId = Geolocation.watchPosition(
        (position) => {
          console.log("Location updated for UI:", position);
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
        },
        (error) => {
          console.log("Location error in tracking:", error);
          if (appState.current === 'active') {
            Alert.alert(
              'Location Error',
              'Unable to track location. Please check if location services are enabled.',
              [
                { text: 'OK' },
                { text: 'Open Settings', onPress: () => openSettings() }
              ]
            );
          }
        },
        { 
          enableHighAccuracy: false, // Less strict for background
          distanceFilter: 10,
          interval: 10000, // Increased interval
          fastestInterval: 5000, // Increased fastest interval
          maximumAge: 60000 // Allow using location up to 1 minute old
        }
      );

      setWatchId(watchId);
      startFirestoreUpdates();
    } else {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
        console.log("Watch cleared");
      }
      stopFirestoreUpdates();
    }

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
        console.log("Watch cleared");
      }
      stopFirestoreUpdates();
    };
  }, [isTracking]);

  useEffect(() => {
    requestLocationPermission().then(() => getCurrentLocation());
  }, []);

  useEffect(() => {
    checkLocationServices();
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      stopLocationTracking();
      if (timerInterval) {
        BackgroundTimer.clearInterval(timerInterval);
      }
      stopFirestoreUpdates();
      BackgroundTimer.stopBackgroundTimer();
    };
  }, [watchId, timerInterval]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Tracking</Text>
        <Text style={styles.headerStatus}>{isTracking ? 'Active' : 'Inactive'}</Text>
      </View>
      <View style={styles.mapContainer}>
        <View style={styles.dummyMap}>
          <Text style={styles.locationText}>
            {currentLocation 
              ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` 
              : 'No location data'}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{distance.toFixed(2)} km</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>{time}s</Text>
        </View>
      </View>

      <View style={styles.locationContainer}>
        <Text style={styles.locationLabel}>Current Location:</Text>
        <Text style={styles.locationValue}>
          {currentLocation 
            ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` 
            : 'No location data'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.shopButton]}
        onPress={handleShopReached}
      >
        <Text style={styles.buttonText}>Shop Reached</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.endDayButton]}
        onPress={handleEndDayOnTracking}
      >
        <Text style={styles.buttonText}>End Day</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerStatus: {
    fontSize: 18,
    color: 'green',
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  dummyMap: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  button: {
    margin: 10,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  shopButton: {
    backgroundColor: '#2196F3',
  },
  endDayButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  locationContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  locationLabel: {
    fontSize: 16,
    color: '#666',
  },
  locationValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});

export default TrackingScreen;