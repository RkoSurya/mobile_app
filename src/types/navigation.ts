// Define GeoPosition type based on react-native-community/geolocation
type GeoPosition = {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
};

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Shop } from '../services/firestoreService';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  AdminLogin: undefined;
  SalespersonList: undefined;
  Tracking: {
    shouldResume?: boolean;
    journeyId?: string;
    currentTime?: number;
    preserveState?: boolean;
  };
  NearbyShops: {
    currentLocation: GeoPosition | null;
    journeyId: string;
  };
  AddShop: {
    currentLocation: GeoPosition | null;
  };
  CreateOrder: {
    shop: Shop;
  };
  DaySummary: {
    resetDay: () => void;
  };
  MapView: {
    shop: {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
    };
    userLocation: {
      latitude: number;
      longitude: number;
    };
    distance: number;
  };
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
