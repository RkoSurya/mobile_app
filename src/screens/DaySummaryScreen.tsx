import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';
import { getTodaySummary } from '../services/firestoreService';
import { useNavigation } from '@react-navigation/native';

interface ShopSummary {
  shopName: string;
  area: string;
  orderCount: number;
  totalAmount: number;
  products: Record<string, {
    quantity: number;
    uom: string;
    amount: number;
  }>;
}

interface Summary {
  totalOrders: number;
  totalAmount: number;
  totalDistance: number;
  shopSummaries: Record<string, ShopSummary>;
}

const DaySummaryScreen = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.error('No user logged in');
        return;
      }

      const data = await getTodaySummary(currentUser.uid);
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShopPress = (shopName: string, area: string, products: Record<string, { quantity: number; uom: string; amount: number }>) => {
    const ordersList = Object.entries(products).map(([product_name, details]) => ({
      product_name,
      ...details
    }));

    navigation.navigate('ShopOrderDetails', {
      shopName,
      area,
      orders: ordersList,
      totalAmount: summary?.shopSummaries[Object.keys(summary.shopSummaries).find(key => 
        summary.shopSummaries[key].shopName === shopName
      ) || '']?.totalAmount || 0
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34C759" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.checkmarkContainer}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.title}>Day Complete!</Text>
        <Text style={styles.subtitle}>Here's your day summary</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statBox, styles.distanceBox]}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{summary?.totalDistance.toFixed(1)} km</Text>
        </View>

        <View style={[styles.statBox, styles.ordersBox]}>
          <Text style={styles.statLabel}>Orders</Text>
          <Text style={styles.statValue}>{summary?.totalOrders || 0}</Text>
        </View>
      </View>

      <View style={[styles.statBox, styles.amountBox]}>
        <Text style={styles.statLabel}>Total Amount</Text>
        <Text style={styles.statValue}>₹{summary?.totalAmount || 0}</Text>
      </View>

      <Text style={styles.sectionTitle}>Order History</Text>

      {Object.entries(summary?.shopSummaries || {}).map(([shopId, shop]) => (
        <TouchableOpacity
          key={shopId}
          style={styles.shopContainer}
          onPress={() => handleShopPress(shop.shopName, shop.area, shop.products)}
        >
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{shop.shopName}</Text>
            <Text style={styles.shopArea}>{shop.area}</Text>
          </View>
          <Text style={styles.shopAmount}>₹{shop.totalAmount}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e8f5e9',
  },
  checkmarkContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkmark: {
    color: 'white',
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  distanceBox: {
    backgroundColor: '#f5f5f5',
  },
  ordersBox: {
    backgroundColor: '#f8f0ff',
  },
  amountBox: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#e8f5e9',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    margin: 16,
    marginBottom: 8,
  },
  shopContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shopArea: {
    fontSize: 14,
    color: '#666',
  },
  shopAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
});

export default DaySummaryScreen;
