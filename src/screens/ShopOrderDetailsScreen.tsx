import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp } from '@react-navigation/native';

type ShopOrderDetailsParams = {
  shopName: string;
  area: string;
  orders: Array<{
    product_name: string;
    quantity: number;
    uom: string;
    amount: number;
  }>;
  totalAmount: number;
};

type RootStackParamList = {
  ShopOrderDetails: ShopOrderDetailsParams;
};

type ShopOrderDetailsScreenRouteProp = RouteProp<RootStackParamList, 'ShopOrderDetails'>;

interface Props {
  route: ShopOrderDetailsScreenRouteProp;
}

const ShopOrderDetailsScreen: React.FC<Props> = ({ route }) => {
  const { shopName, area, orders, totalAmount } = route.params;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.shopName}>{shopName}</Text>
        <Text style={styles.area}>{area}</Text>
        <Text style={styles.subtitle}>Order Details</Text>
      </View>

      <View style={styles.ordersList}>
        {orders.map((order, index) => (
          <View key={index} style={styles.orderItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{order.product_name}</Text>
              <Text style={styles.quantity}>
                {order.quantity} {order.uom}
              </Text>
            </View>
            <Text style={styles.amount}>₹{order.amount}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalAmount}>₹{totalAmount}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  area: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  ordersList: {
    padding: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: '#666',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  totalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
  },
});

export default ShopOrderDetailsScreen;
