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

  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [lastLocation, setLastLocation] = useState<Location | null>(null);
  const [segmentDistances, setSegmentDistances] = useState<Array<{distance: number, timestamp: string}>>([]);

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
      // First request fine location permission
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

      // Then request background location permission
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
            enableHighAccuracy: true,
            distanceFilter: 1,
            interval: 1000,
            fastestInterval: 500,
            maximumAge: 500,
            timeout: 20000,
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

  const calculateDistance = (prevLocation: Location | null, newLocation: Location): number => {
    if (!prevLocation) return 0;
    
    // Convert latitude and longitude from degrees to radians
    const lat1 = prevLocation.latitude * Math.PI / 180;
    const lon1 = prevLocation.longitude * Math.PI / 180;
    const lat2 = newLocation.latitude * Math.PI / 180;
    const lon2 = newLocation.longitude * Math.PI / 180;

    // Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1) * Math.cos(lat2) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers

    console.log('Distance calculation:', {
      prevLat: prevLocation.latitude,
      prevLon: prevLocation.longitude,
      newLat: newLocation.latitude,
      newLon: newLocation.longitude,
      calculatedDistance: distance
    });

    return distance;
  };

  const handleLocationUpdate = async (newLocation: Location) => {
    try {
      console.log('New location received:', {
        lat: newLocation.latitude,
        lon: newLocation.longitude,
        accuracy: newLocation.accuracy
      });

      // Only process location if accuracy is good enough
      if (newLocation.accuracy && newLocation.accuracy <= 20) {
        const prevLocation = locationHistory.length > 0 ? locationHistory[locationHistory.length - 1] : null;
        const newDistance = calculateDistance(prevLocation, newLocation);
        
        // Log the location update to Firebase
        await addLocationData(currentUser.uid, `daily_journey_id_${new Date().toISOString().split('T')[0]}`, {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          accuracy: newLocation.accuracy,
          batteryLevel: await DeviceInfo.getBatteryLevel(),
          eventType: 'day_tracking',
          timestamp: new Date().toISOString(),
          distance: newDistance
        });

        setLocationHistory(prev => [...prev, newLocation]);
        setCurrentLocation(newLocation);
        
        // Only update distance if it's a reasonable value
        if (newDistance >= 0 && newDistance < 1) {
          setDistance(prev => {
            const updated = prev + newDistance;
            console.log('Distance updated:', {
              previous: prev,
              added: newDistance,
              new: updated
            });
            return updated;
          });
        } else {
          console.log('Skipping unrealistic distance:', newDistance);
        }
        
        setLastMovement(new Date().toISOString());
      } else {
        console.log('Location accuracy not good enough:', newLocation.accuracy);
      }
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  };

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
          <Text style={styles.statValue}>{Number(distance || 0).toFixed(5)} km</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>{time}s</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          style={styles.map}
          source={{
            html: `
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
            `
          }}
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
  }
});

export default TrackingScreen;