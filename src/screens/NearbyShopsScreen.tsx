import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

interface Shop {
  id: string;
  name: string;
  distance: number;
}

const NearbyShopsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();

  const handleShopPress = (shop: Shop) => {
    console.log('Shop pressed:', shop);
    navigation.navigate('CreateOrder', { shop });
  };

  const handleNextShopPress = () => {
    // Directly continue the timer
    // Add logic here to resume the timer
    console.log('Continuing to the next shop without prompt.');
    navigation.navigate('Tracking', { shouldResume: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Nearby Shops</Text>
          <TouchableOpacity
            style={styles.addShopButton}
            onPress={() => navigation.navigate('AddShop')}>
            <Text style={styles.addShopButtonText}>+ Add Shop</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.shopList}>
        {/* nearbyShops.map((shop) => (
          <TouchableOpacity
            key={shop.id}
            style={styles.shopItem}
            onPress={() => handleShopPress(shop)}>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <Text style={styles.distance}>{shop.distance}m away</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )) */}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.nextShopButton}
          onPress={() => {
            // Navigate back to tracking with resume flag
            navigation.navigate('Tracking', { shouldResume: true });
          }}>
          <Text style={styles.nextShopButtonText}>Next Shop</Text>
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
  shopList: {
    flex: 1,
    padding: 16,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#4a90e2',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  distance: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  arrow: {
    fontSize: 20,
    color: '#4a90e2',
    marginLeft: 8,
  },
  buttonContainer: {
    padding: 16,
  },
  addShopButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  addShopButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  nextShopButton: {
    backgroundColor: '#4a90e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  nextShopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default NearbyShopsScreen;
