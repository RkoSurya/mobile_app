import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useOrders } from '../context/OrderContext';
import { useNavigation } from '@react-navigation/native';

const DaySummaryScreen = () => {
  const { dailySummary } = useOrders();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.checkmarkContainer}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.title}>Day Complete!</Text>
        <Text style={styles.subtitle}>Here's your day summary</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{dailySummary.distance.toFixed(1)} km</Text>
        </View>

        <View style={[styles.statBox, styles.ordersBox]}>
          <Text style={styles.statLabel}>Orders</Text>
          <Text style={styles.statValue}>{dailySummary.orders.length}</Text>
        </View>
      </View>

      <View style={styles.totalAmountContainer}>
        <Text style={styles.statLabel}>Total Amount</Text>
        <Text style={styles.totalAmount}>₹{dailySummary.totalAmount}</Text>
      </View>

      <View style={styles.orderHistoryContainer}>
        <Text style={styles.orderHistoryTitle}>Order History</Text>
        <ScrollView>
          {dailySummary.orders.map((order, index) => (
            <View key={index} style={styles.orderItem}>
              <View>
                <Text style={styles.shopName}>{order.shopName}</Text>
                <Text style={styles.itemCount}>{order.items.length} items</Text>
              </View>
              <View>
                <Text style={styles.orderTime}>
                  {new Date(order.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
                <Text style={styles.orderAmount}>₹{order.total}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#e8f5e9',
  },
  checkmarkContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkmark: {
    color: '#fff',
    fontSize: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  subtitle: {
    fontSize: 16,
    color: '#4caf50',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 5,
  },
  ordersBox: {
    backgroundColor: '#f3e5f5',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  totalAmountContainer: {
    padding: 20,
    backgroundColor: '#e8f5e9',
    margin: 10,
    borderRadius: 10,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  orderHistoryContainer: {
    flex: 1,
    padding: 20,
  },
  orderHistoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemCount: {
    color: '#666',
    marginTop: 4,
  },
  orderTime: {
    color: '#666',
    textAlign: 'right',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginTop: 4,
  },
});

export default DaySummaryScreen;
