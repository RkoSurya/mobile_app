import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import WebView from 'react-native-webview';
import BackgroundService from 'react-native-background-actions';
import { formatDistance } from '../utils/distanceFormatter';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface TrackingScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Tracking'>;
  route: any;
}

const backgroundOptions = {
  taskName: 'LocationTracking',
  taskTitle: 'Location Tracking Active',
  taskDesc: 'Tracking your journey',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#ff00ff',
  linkingURI: 'yourScheme://chat/jane',
  parameters: {
    delay: 1000,
  },
};

const backgroundTask = async (taskDataArguments) => {
  const isBackground = await BackgroundService.isRunning();
  
  await BackgroundService.updateNotification({
    taskDesc: 'Location tracking is active',
  });
  
  await new Promise(async () => {
    while (BackgroundService.isRunning()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
};

export const TrackingScreen: React.FC<TrackingScreenProps> = ({ navigation, route }) => {
  const { shouldResume = false, preserveState = false, initialTime = 0, initialDistance = 0 } = route.params || {};

  const updateCountRef = useRef<number>(0);
  const lastMovementRef = useRef<string>('0m');
  const lastUpdateTimeRef = useRef<string>('Not updated yet');
  const appStateRef = useRef(AppState.currentState);

  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationHistory, setLocationHistory] = useState<Location[]>([]);
  const [distance, setDistance] = useState<number>(initialDistance);
  const distanceRef = useRef<number>(initialDistance);
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
  const webViewRef = useRef(null);

  const [totalDistance, setTotalDistance] = useState<string>('0 km');
  const [lastLocation, setLastLocation] = useState<Location | null>(null);
  const [segmentDistances, setSegmentDistances] = useState<Array<{distance: number, timestamp: string}>>([]);
  const [lastUpdateStatus, setLastUpdateStatus] = useState('');
  const [lastUpdateTimeStatus, setLastUpdateTimeStatus] = useState('');
  const [accuracyStatus, setAccuracyStatus] = useState<string>('');

  const [displayDistance, setDisplayDistance] = useState<string>('0 m');

  useEffect(() => {
    distanceRef.current = distance;
    console.log('Distance state updated:', {
      newDistance: distance,
      ref: distanceRef.current
    });
  }, [distance]);

  const updateMapLocation = useCallback((latitude: number, longitude: number) => {
    if (webViewRef.current) {
      const script = `
        if (typeof map !== 'undefined') {
          map.setView([${latitude}, ${longitude}], 15);
          map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
              map.removeLayer(layer);
            }
          });
          L.marker([${latitude}, ${longitude}]).addTo(map);
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, []);

  useEffect(() => {
    if (currentLocation) {
      updateMapLocation(currentLocation.latitude, currentLocation.longitude);
    }
  }, [currentLocation, updateMapLocation]);

  useEffect(() => {
    const checkNewDay = () => {
      const currentDay = new Date().toISOString().split('T')[0];
      if (currentDay !== todayRef.current) {
        setDistance(0);
        lastLocationRef.current = null;
        todayRef.current = currentDay;
      }
    };

    const interval = setInterval(checkNewDay, 60000);
    return () => clearInterval(interval);
  }, []);

  const requestAndroidPermission = async () => {
    try {
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

      if (fineLocationPermission !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Fine location permission denied');
        return false;
      }

      const backgroundPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: "Background Location Permission",
          message: "Please select 'Allow all the time' in the next screen to enable background location tracking even when the app is closed.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );

      if (backgroundPermission === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('All location permissions granted');
        return true;
      } else {
        console.log('Background location permission denied');
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

  useEffect(() => {
    if (!isPaused && isTracking) {
      BackgroundTimer.start();

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

  useEffect(() => {
    const startLocationTracking = async () => {
      try {
        const hasPermission = await requestAndroidPermission();
        if (!hasPermission) {
          console.log('Location permission not granted');
          return;
        }

        BackgroundTimer.start();

        locationWatchIdRef.current = Geolocation.watchPosition(
          async position => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };
            await handleLocationUpdate(newLocation);
          },
          error => console.error('Error watching position:', error),
          {
            enableHighAccuracy: false,
            distanceFilter: 0,
            interval: 20000,     // Update every 20 seconds
            fastestInterval: 20000,
            maximumAge: 10000,  // Accept locations up to 10 seconds old
            timeout: 20000,     // Allow 20 seconds to get a location fix
            forceRequestLocation: true,
            showLocationDialog: true,
            useSignificantChanges: false
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

  useEffect(() => {
    if (!isPaused && isTracking && currentLocation) {
      const updateFirestore = async () => {
        try {
          const batteryLevel = await DeviceInfo.getBatteryLevel();

          const today = new Date().toISOString().split('T')[0];
          const journeyId = `daily_journey_id_${today}`;  // Using consistent format

          await addLocationData(currentUser.uid, journeyId, {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy,
            batteryLevel,
            eventType: 'day_tracking',
            timestamp: new Date().toISOString(),
            distance: distance
          });

          const now = new Date();
          setLastUpdateStatus('Last update successful');
          setLastUpdateTimeStatus(now.toLocaleTimeString());
        } catch (error) {
          console.error('Error updating Firestore:', error);
          setLastUpdateStatus('Update failed');
          setLastUpdateTimeStatus(new Date().toLocaleTimeString());
        }
      };

      firestoreIntervalRef.current = BackgroundTimer.setInterval(updateFirestore, 20000);  // Update Firestore every 20 seconds

      return () => {
        if (firestoreIntervalRef.current) {
          BackgroundTimer.clearInterval(firestoreIntervalRef.current);
        }
      };
    }
  }, [isPaused, isTracking, currentLocation]);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (!isPaused) {
        setIsTracking(true);
      }
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      setIsTracking(false);
    });

    if (!isPaused) {
      setIsTracking(true);
    }

    return () => {
      setIsTracking(false);
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, isPaused]);

  const calculateDistance = (prevLocation: Location | null, newLocation: Location): number => {
    if (!prevLocation) return 0;
    
    // Convert latitude and longitude to radians
    const lat1 = prevLocation.latitude * Math.PI / 180;
    const lon1 = prevLocation.longitude * Math.PI / 180;
    const lat2 = newLocation.latitude * Math.PI / 180;
    const lon2 = newLocation.longitude * Math.PI / 180;

    const R = 6371000; // Earth's radius in meters
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1) * Math.cos(lat2) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Basic validation
    if (distance < 0 || !isFinite(distance) || isNaN(distance)) {
      console.log('Invalid distance calculation:', {
        prevLat: prevLocation.latitude,
        prevLon: prevLocation.longitude,
        newLat: newLocation.latitude,
        newLon: newLocation.longitude,
        distance: distance
      });
      return 0;
    }

    // Speed check - max realistic speed ~180 km/h = 50 m/s (increased to be more lenient)
    const MAX_SPEED = 50; // meters per second
    const timeDiff = (Date.now() - prevLocation.timestamp) / 1000; // convert to seconds
    if (timeDiff <= 0) {
      console.log('Invalid time difference:', timeDiff);
      return 0;
    }
    const speed = distance / timeDiff;
    
    if (speed > MAX_SPEED) {
      console.log('Unrealistic speed detected, skipping distance:', {
        distance,
        timeDiff,
        speed,
        maxSpeed: MAX_SPEED
      });
      return 0;
    }

    // Minimum distance threshold to avoid tiny movements
    const MIN_DISTANCE_THRESHOLD = 2; // meters - reduced to 2m
    if (distance < MIN_DISTANCE_THRESHOLD) {
      return 0;
    }

    console.log('Distance update:', {
      distance: Math.round(distance),
      speed: Math.round(speed * 3.6) + ' km/h', // Convert to km/h for logging
      accuracy: Math.round(newLocation.accuracy) + 'm'
    });

    return distance;
  };

  const handleLocationUpdate = async (newLocation: any) => {
    const locationData = {
      ...newLocation,
      timestamp: Date.now()
    };

    // Update UI with latest location
    setCurrentLocation(locationData);
    
    // Update accuracy status for information only
    let accuracyMessage = '';
    if (newLocation.accuracy > 500) {
      accuracyMessage = `Low accuracy: ${Math.round(newLocation.accuracy)}m`;
    } else if (newLocation.accuracy > 100) {
      accuracyMessage = `Medium accuracy: ${Math.round(newLocation.accuracy)}m`;
    } else {
      accuracyMessage = `Good accuracy: ${Math.round(newLocation.accuracy)}m`;
    }
    setAccuracyStatus(accuracyMessage);

    // Update distance if tracking
    if (isTracking && lastLocationRef.current) {
      const newDistance = calculateDistance(
        lastLocationRef.current,
        locationData
      );
      
      if (newDistance > 0) {
        setDistance(prevDistance => {
          const updatedDistance = prevDistance + newDistance;
          setDisplayDistance(formatDistance(updatedDistance));
          return updatedDistance;
        });
      }
    }
    
    // Always update last location
    lastLocationRef.current = locationData;
    setLastLocation(locationData);
    
    // Update last movement info
    const now = new Date();
    updateCountRef.current += 1;
    setUpdateCount(updateCountRef.current);
  };

  const handleEndDayOnTracking = async () => {
    try {
      if (await BackgroundService.isRunning()) {
        await BackgroundService.stop();
      }
    } catch (error) {
      console.error('Error stopping background service:', error);
    }
    
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
    const today = new Date().toISOString().split('T')[0];
    const journeyId = `daily_journey_id_${today}`;  // Using consistent format
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
      distance: Number(distance.toFixed(3)),
      currentTime: time,
      journeyId: journeyId,
      preserveState: true,
      isTracking: isTracking,
      isPaused: isPaused
    });
  };

  useEffect(() => {
    const startBackgroundTask = async () => {
      if (!isPaused && isTracking) {
        try {
          if (!await BackgroundService.isRunning()) {
            await BackgroundService.start(backgroundTask, backgroundOptions);
            console.log('Background service started');
          }
        } catch (error) {
          console.error('Failed to start background service:', error);
        }
      } else {
        try {
          if (await BackgroundService.isRunning()) {
            await BackgroundService.stop();
            console.log('Background service stopped');
          }
        } catch (error) {
          console.error('Failed to stop background service:', error);
        }
      }
    };

    startBackgroundTask();

    return () => {
      BackgroundService.stop();
    };
  }, [isPaused, isTracking]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tracking</Text>
        <Text style={[styles.status, { color: isTracking ? '#00C851' : '#666' }]}>
          {isTracking ? 'Active' : 'Inactive'}
        </Text>
      </View>

      {currentLocation && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>
            Current Location:
          </Text>
          <Text style={styles.coordinatesText}>
            {currentLocation.latitude.toFixed(7)}, {currentLocation.longitude.toFixed(7)}
          </Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Current Session Distance</Text>
          <Text style={styles.infoValue}>{displayDistance}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Time</Text>
          <Text style={styles.infoValue}>{time}s</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
                <style>
                  body { margin: 0; padding: 0; }
                  #map { height: 100vh; width: 100vw; }
                </style>
              </head>
              <body>
                <div id="map"></div>
                <script>
                  var map = L.map('map', {
                    zoomControl: true,
                    attributionControl: false
                  }).setView([${currentLocation?.latitude || 11.9074125}, ${currentLocation?.longitude || 79.3076478}], 15);
                  
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                  }).addTo(map);

                  if (${currentLocation ? 'true' : 'false'}) {
                    L.marker([${currentLocation?.latitude || 11.9074125}, ${currentLocation?.longitude || 79.3076478}]).addTo(map);
                  }
                </script>
              </body>
            </html>
          ` }}
          style={styles.map}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          onLoad={() => {
            if (currentLocation) {
              updateMapLocation(currentLocation.latitude, currentLocation.longitude);
            }
          }}
        />
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.button, styles.shopButton, styles.smallButton]}
            onPress={handleShopReached}>
            <Text style={styles.buttonText}>Shop Reached</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.endDayButton, styles.smallButton]}
            onPress={handleEndDayOnTracking}>
            <Text style={styles.buttonText}>End Day</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    padding: 20,
    width: '100%',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  smallButton: {
    flex: 1,
    paddingVertical: 12,
  },
  shopButton: {
    backgroundColor: '#007AFF',
  },
  endDayButton: {
    backgroundColor: '#ff9900',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  mapContainer: {
    height: 300,
    width: '100%',
    backgroundColor: '#fff',
    marginVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  mapLoading: {
    height: 300,
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    marginTop: 10
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  updateStatus: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 5,
    alignItems: 'center'
  },
  updateStatusText: {
    fontSize: 14,
    color: '#666'
  },
  statusContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    margin: 10,
  },
  statusText: {
    fontSize: 14,
    marginVertical: 2,
  },
  lowAccuracy: {
    color: '#ff4444',
  },
  mediumAccuracy: {
    color: '#ffbb33',
  },
  goodAccuracy: {
    color: '#00C851',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5
  },
  infoLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 5
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  locationContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 15,
    marginBottom: 30
  },
  locationText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 5
  },
  coordinatesText: {
    fontSize: 18,
    fontWeight: '500'
  },
});

export default TrackingScreen;