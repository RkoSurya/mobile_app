import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import firestore from '@react-native-firebase/firestore';

type Props = NativeStackScreenProps<RootStackParamList, 'UserLocationMap'>;

type Location = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

type RouteLocation = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

const UserLocationMapScreen = ({ route }: Props) => {
  const { userId, userName } = route.params;
  const [routeLocations, setRouteLocations] = useState<RouteLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserLocations();
  }, [userId]);

  const fetchUserLocations = async () => {
    try {
      // Get today's start timestamp
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const journeySnapshot = await firestore()
        .collection('daily_journeys')
        .where('user_id', '==', userId)
        .get();

      if (!journeySnapshot.empty) {
        let locations: RouteLocation[] = [];

        for (const doc of journeySnapshot.docs) {
          const journeyData = doc.data();
          const trackingLocations = journeyData.tracking_locations || {};
          
          // Convert object to array and sort by timestamp
          const locationEntries = Object.entries(trackingLocations)
            .map(([_, locData]: [string, any]) => ({
              latitude: parseFloat(locData.latitude_string || locData.latitude),
              longitude: parseFloat(locData.longitude_string || locData.longitude),
              timestamp: locData.timestamp?.seconds || 0
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

          locations = locations.concat(locationEntries);
        }

        if (locations.length > 0) {
          setRouteLocations(locations);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to fetch location data');
      setLoading(false);
    }
  };

  const generateMapHTML = (locations: RouteLocation[]) => {
    if (locations.length === 0) return '';

    const startLocation = locations[0];
    const currentLocation = locations[locations.length - 1];
    const routePoints = locations.map(loc => [loc.latitude, loc.longitude]);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <style>
            body { margin: 0; }
            #map { height: 100vh; width: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = L.map('map').setView([${currentLocation.latitude}, ${currentLocation.longitude}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: 'OpenStreetMap contributors'
            }).addTo(map);
            
            // Custom icons
            const startIcon = L.divIcon({
              html: '<div style="background-color: #4CAF50; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
              className: 'custom-div-icon',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });

            const currentIcon = L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });

            // Add start marker
            L.marker([${startLocation.latitude}, ${startLocation.longitude}], {icon: startIcon})
              .addTo(map)
              .bindPopup("${userName}'s start location");

            // Add current location marker
            L.marker([${currentLocation.latitude}, ${currentLocation.longitude}], {icon: currentIcon})
              .addTo(map)
              .bindPopup("${userName}'s current location");

            // Draw route line
            const routePoints = ${JSON.stringify(routePoints)};
            L.polyline(routePoints, {
              color: '#1976D2',
              weight: 4,
              opacity: 0.8,
              lineJoin: 'round'
            }).addTo(map);

            // Fit map bounds to show all points
            map.fitBounds(routePoints);
          </script>
        </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (routeLocations.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No location data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: generateMapHTML(routeLocations) }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  map: {
    flex: 1,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default UserLocationMapScreen;
