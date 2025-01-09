import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import BackgroundTimer from 'react-native-background-timer';
import DeviceInfo from 'react-native-device-info';
import auth from '@react-native-firebase/auth';
import { addLocationData, calculateDistance } from '../services/firestoreService';
import { useNavigation, useRoute } from '@react-native-navigation/native';
import { NavigationProp, RootStackParamList } from '../types/navigation';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import { AppState } from 'react-native';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface TrackingScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Tracking'>;
  route: any;
}

export const TrackingScreen: React.FC<TrackingScreenProps> = ({ navigation, route }) => {
  const { shouldResume = false, preserveState = false, initialTime = 0, initialDistance = 0 } = route.params || {};

  // Store these values in refs to persist across re-renders and navigation
  const updateCountRef = useRef<number>(0);
  const lastMovementRef = useRef<string>('0m');
  const lastUpdateTimeRef = useRef<string>('Not updated yet');
  const appStateRef = useRef(AppState.currentState);

  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationHistory, setLocationHistory] = useState<Location[]>([]);
  const [distance, setDistance] = useState<number>(initialDistance);
  const [time, setTime] = useState(initialTime);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>(lastUpdateTimeRef.current);
  const [lastMovement, setLastMovement] = useState<string>(lastMovementRef.current);
  const [updateCount, setUpdateCount] = useState<number>(updateCountRef.current);
  const timerIntervalRef = useRef<number | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);
  const firestoreIntervalRef = useRef<number | null>(null);
  const lastLocationRef = useRef<Location | null>(null);
  const currentUser = auth().currentUser;
  const todayRef = useRef(new Date().toISOString().split('T')[0]);

  // Reset tracking if it's a new day
  useEffect(() => {
    const checkNewDay = () => {
      const currentDay = new Date().toISOString().split('T')[0];
      if (currentDay !== todayRef.current) {
        // It's a new day, reset everything
        setDistance(0);
        lastLocationRef.current = null;
        todayRef.current = currentDay;
      }
    };

    // Check for day change every minute
    const interval = setInterval(checkNewDay, 60000);
    return () => clearInterval(interval);
  }, []);

  const requestAndroidPermission = async () => {
    try {
      const backgroundPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: "Background Location Permission",
          message: "App needs background location access for tracking when screen is off",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );

      const fineLocationPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "App needs access to location for tracking",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );

      if (backgroundPermission === PermissionsAndroid.RESULTS.GRANTED && 
          fineLocationPermission === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('All location permissions granted');
        return true;
      } else {
        console.log('Location permissions denied');
        return false;
      }
    } catch (err) {
      console.warn('Error requesting location permission:', err);
      return false;
    }
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => resolve(position),
        error => reject(error),
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    });
  };

  // Timer effect
  useEffect(() => {
    if (!isPaused && isTracking) {
      // Start background timer
      BackgroundTimer.start();

      // Use backgroundTimer.runBackgroundTimer for true background operation
      timerIntervalRef.current = BackgroundTimer.runBackgroundTimer(() => {
        setTime((prevTime: number) => prevTime + 1);
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        BackgroundTimer.stopBackgroundTimer();
        BackgroundTimer.stop();
      }
    };
  }, [isTracking, isPaused]);

  // Add AppState change listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('App State changed:', {
        from: appStateRef.current,
        to: nextAppState
      });
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('App has gone to the background!');
      }
      
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Location tracking effect
  useEffect(() => {
    const startLocationTracking = async () => {
      try {
        const hasPermission = await requestAndroidPermission();
        if (!hasPermission) {
          console.log('Location permission not granted');
          return;
        }

        // Start background timer for continuous tracking
        BackgroundTimer.start();

        locationWatchIdRef.current = Geolocation.watchPosition(
          position => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || 0
            };

            // Debug log for location update with app state
            console.log('Received location update:', {
              latitude: Number(newLocation.latitude.toFixed(7)),
              longitude: Number(newLocation.longitude.toFixed(7)),
              accuracy: newLocation.accuracy,
              time: new Date().toISOString(),
              isBackground: appStateRef.current !== 'active',
              appState: appStateRef.current
            });

            // Update refs and state
            const currentTime = new Date().toLocaleTimeString();
            lastUpdateTimeRef.current = currentTime;
            setLastUpdateTime(currentTime);

            updateCountRef.current += 1;
            setUpdateCount(updateCountRef.current);

            console.log('Location Updated:', {
              latitude: Number(newLocation.latitude.toFixed(7)),
              longitude: Number(newLocation.longitude.toFixed(7)),
              accuracy: newLocation.accuracy,
              time: new Date().toISOString()
            });

            // Calculate distance if we have a previous location
            if (lastLocationRef.current) {
              const newDistanceMeters = calculateDistance(
                lastLocationRef.current.latitude,
                lastLocationRef.current.longitude,
                newLocation.latitude,
                newLocation.longitude
              );

              // Update movement indicator with ref
              const movementText = `${Math.round(newDistanceMeters)}m`;
              lastMovementRef.current = movementText;
              setLastMovement(movementText);

              // Debug logs to verify tracking
              console.log('New Location:', {
                latitude: Number(newLocation.latitude.toFixed(7)),
                longitude: Number(newLocation.longitude.toFixed(7)),
                accuracy: newLocation.accuracy,
                movement: newDistanceMeters + 'm'
              });

              // Update distance if accuracy is reasonable (50m) and movement is not unrealistic (500m)
              if (newLocation.accuracy < 50 && newDistanceMeters < 500) {
                const newDistance = (newDistanceMeters / 1000); // Convert to kilometers
                setDistance(async prev => {
                  const updatedDistance = prev + newDistance;

                  // Save the updated distance to Firestore
                  const today = new Date().toISOString().split('T')[0];
                  const journeyId = `daily_journey_id_${today}`;

                  // Save location with distance
                  addLocationData(currentUser.uid, journeyId, {
                    latitude: Number(newLocation.latitude.toFixed(7)),
                    longitude: Number(newLocation.longitude.toFixed(7)),
                    accuracy: newLocation.accuracy,
                    batteryLevel: await DeviceInfo.getBatteryLevel(),
                    eventType: 'day_tracking',
                    timestamp: new Date().toISOString(),
                    distance: newDistance
                  });

                  return Number(updatedDistance.toFixed(3)); // Keep 3 decimal places
                });
              }
            }

            lastLocationRef.current = newLocation;
            setCurrentLocation(newLocation);
            setLocationHistory(prev => [...prev, newLocation]);
          },
          error => console.error('Error watching position:', error),
          {
            enableHighAccuracy: false,
            distanceFilter: 1, // Update when moved at least 1 meter
            interval: 2000, // Update every 2 seconds
            fastestInterval: 1000, // Fastest update interval of 1 second
            maximumAge: 1000, // Only use locations that are at most 1 second old
            timeout: 20000, // Allow up to 20 seconds to get a GPS fix
            forceRequestLocation: true, // Force location request even in background
            showLocationDialog: true, // Show system location dialog if needed
            useSignificantChanges: true // Use significant changes to save battery
          }
        );
      } catch (error) {
        console.error('Error starting location tracking:', error);
      }
    };

    if (!isPaused && isTracking) {
      startLocationTracking();
    }

    return () => {
      if (locationWatchIdRef.current !== null) {
        Geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, [isPaused, isTracking]);

  // Firestore updates effect
  useEffect(() => {
    if (!isPaused && isTracking && currentLocation) {
      const updateFirestore = async () => {
        try {
          const batteryLevel = await DeviceInfo.getBatteryLevel();

          await addLocationData(currentUser.uid, `daily_journey_id_${new Date().toISOString().split('T')[0]}`, {
            latitude: Number(currentLocation.latitude.toFixed(7)),
            longitude: Number(currentLocation.longitude.toFixed(7)),
            accuracy: currentLocation.accuracy,
            batteryLevel,
            eventType: 'day_tracking',
            timestamp: new Date().toISOString(),
            distance: Number(distance.toFixed(5)) // Ensure distance is a number with 3 decimal places
          });
        } catch (error) {
          console.error('Error updating Firestore:', error);
        }
      };

      firestoreIntervalRef.current = BackgroundTimer.setInterval(updateFirestore, 60000);
      // Initial update
      updateFirestore();
    }

    return () => {
      if (firestoreIntervalRef.current !== null) {
        BackgroundTimer.clearInterval(firestoreIntervalRef.current);
        firestoreIntervalRef.current = null;
      }
    };
  }, [isPaused, isTracking, currentLocation]);

  // Navigation focus/blur effect
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (!isPaused) {
        setIsTracking(true);
      }
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      setIsTracking(false);
    });

    // Start tracking initially if not paused
    if (!isPaused) {
      setIsTracking(true);
    }

    return () => {
      setIsTracking(false);
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, isPaused]);

  const handleEndDayOnTracking = async () => {
    setIsTracking(false);
    setIsPaused(true);
    setTime(0);
    setCurrentLocation(null);
    setLocationHistory([]);
    setDistance(0);
    navigation.navigate('Home');
  };

  const handleShopReached = () => {
    setIsPaused(true);
    setIsTracking(false);
    navigation.navigate('NearbyShops', {
      currentLocation: currentLocation ? {
        coords: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          altitude: null,
          accuracy: currentLocation.accuracy,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now()
      } : null,
      distance: Number(distance.toFixed(3)), // Ensure distance is a number with 3 decimal places
      currentTime: time,
      journeyId: `daily_journey_id_${new Date().toISOString().split('T')[0]}`,
      preserveState: true, // Add this to indicate we want to preserve state
      isTracking: isTracking,
      isPaused: isPaused
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tracking</Text>
        <Text style={[styles.status, isTracking ? styles.activeStatus : styles.inactiveStatus]}>
          {isTracking ? 'Active' : 'Inactive'}
        </Text>
      </View>

      {currentLocation && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>
            {currentLocation.latitude.toFixed(7)}, {currentLocation.longitude.toFixed(7)}
          </Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Current Session Distance</Text>
          <Text style={styles.statValue}>{Number(distance || 0).toFixed(4)} km</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>{time}s</Text>
        </View>
      </View>

      <View style={styles.locationInfo}>
        <Text style={styles.locationLabel}>Current Location:</Text>
        <Text style={styles.coordinates}>
          {currentLocation ? 
            `${currentLocation.latitude.toFixed(7)}, ${currentLocation.longitude.toFixed(7)}` 
            : 'Waiting for location...'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.shopButton]}
          onPress={handleShopReached}>
          <Text style={styles.buttonText}>Shop Reached</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.endButton]}
          onPress={handleEndDayOnTracking}>
          <Text style={styles.buttonText}>End Day</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold'
  },
  status: {
    fontSize: 18,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  activeStatus: {
    color: '#34C759',
  },
  inactiveStatus: {
    color: '#FF3B30'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5
  },
  statLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 5
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  locationInfo: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 15,
    marginBottom: 30
  },
  locationLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 5
  },
  coordinates: {
    fontSize: 18,
    fontWeight: '500'
  },
  buttonContainer: {
    gap: 15
  },
  button: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  shopButton: {
    backgroundColor: '#007AFF'
  },
  endButton: {
    backgroundColor: '#FF3B30'
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  }
});

export default TrackingScreen;