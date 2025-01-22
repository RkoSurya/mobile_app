import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';

type RouteParams = {
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

const MapViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'MapView'>>();
  const { shop, userLocation, distance } = route.params;

  // Create the HTML content for the map
  const mapHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
          #map { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize the map
          const map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          });

          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          // Add shop marker
          const shopIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
          });
          
          const shopMarker = L.marker([${shop.latitude}, ${shop.longitude}], { icon: shopIcon })
            .bindPopup('${shop.name}<br>Shop Location')
            .addTo(map);

          // Add user location marker
          const userIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
          });
          
          const userMarker = L.marker([${userLocation.latitude}, ${userLocation.longitude}], { icon: userIcon })
            .bindPopup('Your Location')
            .addTo(map);

          // Draw a line between points
          const line = L.polyline([
            [${shop.latitude}, ${shop.longitude}],
            [${userLocation.latitude}, ${userLocation.longitude}]
          ], {
            color: '#007AFF',
            weight: 3,
            opacity: 0.7
          }).addTo(map);

          // Fit bounds to show both markers
          const bounds = L.latLngBounds([
            [${shop.latitude}, ${shop.longitude}],
            [${userLocation.latitude}, ${userLocation.longitude}]
          ]);
          map.fitBounds(bounds, { padding: [50, 50] });
        </script>
      </body>
    </html>
  `;

  const handleCreateOrder = () => {
    navigation.navigate('CreateOrder', {
      shop: {
        id: shop.id,
        name: shop.name,
        area: '',
        distance: distance
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          source={{ html: mapHTML }}
          style={styles.map}
          scrollEnabled={false}
          bounces={false}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
          }}
        />
      </View>

      <View style={styles.bottomSheet}>
        <Text style={styles.shopName}>{shop.name}</Text>
        <Text style={styles.distance}>Distance: {distance.toFixed(2)} meters</Text>
        <TouchableOpacity style={styles.button} onPress={handleCreateOrder}>
          <Text style={styles.buttonText}>Create Order</Text>
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
  mapContainer: {
    flex: 1,
    marginBottom: 150, // Space for bottom sheet
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  distance: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MapViewScreen;
