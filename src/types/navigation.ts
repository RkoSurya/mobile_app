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

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Tracking: {
    shouldResume?: boolean;
    journeyId?: string;
  };
  NearbyShops: {
    currentLocation: GeoPosition | null;
    distance: number;
    time: number;
  } | undefined;
  AddShop: undefined;
  CreateOrder: {
    shop: {
      id: string;
      name: string;
      distance: number;
    };
  };
  DaySummary: {
    resetDay: () => void;
  };
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
