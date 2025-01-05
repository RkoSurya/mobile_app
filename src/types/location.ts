export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface Location {
  coords: Coordinates;
  timestamp: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export type LocationEventType = 'day_tracking' | 'shop_in' | 'shop_visit';
