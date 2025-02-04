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

const UserLocationMapScreen = ({ route }: Props) => {
  const { userId, userName } = route.params;
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserLocation();
  }, [userId]);

  const fetchUserLocation = async () => {
    try {
      // Get today's start timestamp
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const journeySnapshot = await firestore()
        .collection('daily_journeys')
        .where('user_id', '==', userId)
        .get();

      if (!journeySnapshot.empty) {
        // Find the latest journey and its locations
        let latestLocation = null;
        let latestTimestamp = 0;

        for (const doc of journeySnapshot.docs) {
          const journeyData = doc.data();
          const locations = journeyData.tracking_locations || {};
          const locationEntries = Object.entries(locations);
          
          if (locationEntries.length > 0) {
            // Find the latest location in this journey
            for (const [_, locData] of locationEntries) {
              const timestamp = locData.timestamp?.seconds || 0;
              if (timestamp > latestTimestamp) {
                latestTimestamp = timestamp;
                latestLocation = locData;
              }
            }
          }
        }

        if (latestLocation) {
          setLocation({
            latitude: parseFloat(latestLocation.latitude_string || latestLocation.latitude),
            longitude: parseFloat(latestLocation.longitude_string || latestLocation.longitude),
            timestamp: latestLocation.timestamp,
          });
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching location:', err);
      setError('Failed to fetch location data');
      setLoading(false);
    }
  };

  const generateMapHTML = (location: Location) => {
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
            const map = L.map('map').setView([${location.latitude}, ${location.longitude}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Add marker for the salesperson
            const marker = L.marker([${location.latitude}, ${location.longitude}])
              .addTo(map)
              .bindPopup("${userName}'s last known location");
            
            marker.openPopup();
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

  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No location data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: generateMapHTML(location) }}
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
