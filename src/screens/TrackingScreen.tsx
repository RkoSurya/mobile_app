import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import BackgroundTimer from 'react-native-background-timer';
import DeviceInfo from 'react-native-device-info';
import auth from '@react-native-firebase/auth';
import { addLocationData } from '../services/firestoreService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp, RootStackParamList } from '../types/navigation';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';

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
  const { shouldResume = false, preserveState = false, initialTime = 0 } = route.params || {};
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationHistory, setLocationHistory] = useState<Location[]>([]);
  const [distance, setDistance] = useState(0);
  const [time, setTime] = useState(initialTime);
  const timerIntervalRef = useRef<number | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);
  const firestoreIntervalRef = useRef<number | null>(null);

  const requestAndroidPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "App needs access to location for tracking",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location permission granted');
        return true;
      } else {
        console.log('Location permission denied');
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
      timerIntervalRef.current = BackgroundTimer.setInterval(() => {
        setTime((prevTime: number) => prevTime + 1);
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current !== null) {
        BackgroundTimer.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPaused, isTracking]);

  // Location tracking effect
  useEffect(() => {
    const startLocationTracking = async () => {
      try {
        const hasPermission = await requestAndroidPermission();
        if (!hasPermission) {
          console.log('Location permission not granted');
          return;
        }

        locationWatchIdRef.current = Geolocation.watchPosition(
          position => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || 0
            };
            setCurrentLocation(newLocation);
            setLocationHistory(prev => [...prev, newLocation]);
          },
          error => console.error('Error watching position:', error),
          {
            enableHighAccuracy: false,
            distanceFilter: 10,
            interval: 5000,
            fastestInterval: 2000
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
          const currentUser = auth().currentUser;
          if (!currentUser?.uid) return;

          const batteryLevel = await DeviceInfo.getBatteryLevel();
          
          await addLocationData(currentUser.uid, 'daily_journey_' + new Date().toISOString().split('T')[0], {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy,
            batteryLevel,
            eventType: 'day_tracking',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error updating location:', error);
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
          accuracy: 0,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now()
      } : null,
      distance: distance,
      currentTime: time,
      journeyId: 'daily_journey_' + new Date().toISOString().split('T')[0]
    });
  };

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