import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import Geolocation, { GeoPosition } from '@react-native-community/geolocation';
import BackgroundTimer from 'react-native-background-timer';
import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { addLocationData, getNearbyShops, Shop } from '../services/firestoreService';
import type { RootStackParamList } from '../types/navigation';
import type { Coordinates } from '../types/location';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const earthRadius = 6371; // kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;

  return distance * 1000; // Convert to meters
};

const NearbyShopsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const [currentLocation, setCurrentLocation] = useState<GeoPosition | null>(route.params?.currentLocation || null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const locationWatchId = useRef<number | null>(null);
  const firestoreInterval = useRef<number | null>(null);
  const isTrackingRef = useRef(route.params?.isTracking ?? true);
  const isPausedRef = useRef(route.params?.isPaused ?? false);
  const lastLocation = useRef<GeoPosition | null>(null);

  // Handle back navigation to preserve state
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (route.params?.preserveState) {
        e.preventDefault();
        navigation.navigate('Tracking', {
          shouldResume: true,
          preserveState: true,
          initialTime: route.params.currentTime,
          initialDistance: route.params.distance || 0,
          isTracking: isTrackingRef.current,
          isPaused: isPausedRef.current
        });
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Single useEffect for all tracking functionality
  useEffect(() => {
    console.log('Starting shop tracking');
    isTrackingRef.current = true;

    // Start location tracking
    locationWatchId.current = Geolocation.watchPosition(
      position => {
        if (isTrackingRef.current) {
          setCurrentLocation(position);
          lastLocation.current = position;
          // Load shops when location updates
          loadNearbyShops({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        }
      },
      error => console.error('Error watching position:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000
      }
    );

    // Start Firestore updates
    const updateFirestore = async () => {
      try {
        if (!isTrackingRef.current || !currentLocation) return;

        const batteryLevel = await DeviceInfo.getBatteryLevel();
        
        // Save location with distance for shop visits
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        // Calculate distance if we have previous location
        let newDistance = 0;
        if (lastLocation.current) {
          const newDistanceMeters = calculateDistance(
            lastLocation.current.coords.latitude,
            lastLocation.current.coords.longitude,
            currentLocation.coords.latitude,
            currentLocation.coords.longitude
          );
          newDistance = newDistanceMeters / 1000; // Convert to kilometers
        }

        const today = new Date().toISOString().split('T')[0];
        const journeyId = `daily_journey_id_${today}`;  // Using consistent format
        
        await addLocationData(currentUser.uid, journeyId, {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy || 0,
          batteryLevel: batteryLevel,
          eventType: 'shop_in',
          timestamp: new Date().toISOString(),
          distance: newDistance
        });
      } catch (error) {
        console.error('Error updating Firestore:', error);
      }
    };

    firestoreInterval.current = BackgroundTimer.setInterval(updateFirestore, 60000);
    // Initial update
    updateFirestore();

    // Initial shop load if we have location
    if (currentLocation) {
      loadNearbyShops({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      });
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up shop tracking');
      isTrackingRef.current = false;
      
      if (locationWatchId.current !== null) {
        Geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
      
      if (firestoreInterval.current !== null) {
        BackgroundTimer.clearInterval(firestoreInterval.current);
        firestoreInterval.current = null;
      }
    };
  }, [route.params.journeyId]);

  const loadNearbyShops = async (coords: Coordinates) => {
    try {
      setLoading(true);
      console.log('Loading shops for coordinates:', coords);
      const nearbyShops = await getNearbyShops(coords);
      console.log('Found nearby shops:', nearbyShops);
      setShops(nearbyShops);
    } catch (error) {
      console.error('Error loading shops:', error);
      Alert.alert('Error', 'Failed to load nearby shops');
    } finally {
      setLoading(false);
    }
  };

  const handleNextShop = () => {
    // Stop tracking in this screen
    isTrackingRef.current = false;
    if (locationWatchId.current !== null) {
      Geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
    if (firestoreInterval.current !== null) {
      BackgroundTimer.clearInterval(firestoreInterval.current);
      firestoreInterval.current = null;
    }
    
    // Navigate back with proper params to resume tracking
    navigation.navigate('Tracking', {
      shouldResume: true,
      preserveState: true,
      initialTime: route.params.currentTime,
      initialDistance: route.params.distance || 0,
      isTracking: isTrackingRef.current,
      isPaused: isPausedRef.current
    });
  };

  const handleAddShop = () => {
    navigation.navigate('AddShop', { currentLocation });
  };

  const ShopCard = ({ shop, currentLocation }: { shop: Shop; currentLocation?: Coordinates }) => {
    const handleShopSelect = () => {
      console.log('Selected shop:', {
        id: shop.id,
        name: shop.name,
        area: shop.area,
        distance: shop.distance
      });
      
      navigation.navigate('CreateOrder', {
        shop: {
          id: shop.id,
          name: shop.name,
          area: shop.area,
          distance: shop.distance
        },
        visitId: route.params.journeyId
      });
    };

    return (
      <TouchableOpacity style={styles.shopCard} onPress={handleShopSelect}>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopArea}>{shop.area}</Text>
          {shop.distance !== undefined && (
            <Text style={styles.shopDistance}>
              {(shop.distance / 1000).toFixed(2)} km away
            </Text>
          )}
        </View>
        <Text style={styles.shopPhone}>{shop.phoneNumber}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Nearby Shops</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => currentLocation && loadNearbyShops({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude
              })}>
              <Text style={styles.refreshButtonText}>↻ Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addShopButton}
              onPress={handleAddShop}>
              <Text style={styles.addShopButtonText}>+ Add Shop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <View style={styles.content}>
          {shops.length > 0 ? (
            <FlatList
              data={shops}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ShopCard shop={item} currentLocation={currentLocation?.coords} />
              )}
            />
          ) : (
            <Text style={styles.noShopsText}>No shops found nearby</Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNextShop}
        >
          <Text style={styles.nextButtonText}>Next Shop</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f7ff',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 16,
    backgroundColor: '#f0f7ff',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noShopsText: {
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
  },
  nextButton: {
    backgroundColor: '#4a90e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  addShopButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addShopButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  shopCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopInfo: {
    marginBottom: 8,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  shopArea: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  shopDistance: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  shopPhone: {
    fontSize: 14,
    color: '#27ae60',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default NearbyShopsScreen;
