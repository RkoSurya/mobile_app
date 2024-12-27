import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '../types/navigation';

interface Shop {
  id: string;
  name: string;
  distance: string;
  latitude: number;
  longitude: number;
}

const NearbyShops = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<any>>();
  const { currentLocation } = route.params || {};

  const handleShopSelect = (shop: Shop) => {
    // Handle shop selection
    console.log('Selected shop:', shop);
    // You can navigate to shop details or handle the selection as needed
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Shops</Text>
      
      <ScrollView style={styles.shopList}>
        
      </ScrollView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Next Shop</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  shopList: {
    flex: 1,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  shopDistance: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    fontSize: 20,
    color: '#666',
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#333',
  },
});

export default NearbyShops;
