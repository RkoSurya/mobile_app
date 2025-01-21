import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { createOrder, LineItem } from '../services/firestoreService';
import auth from '@react-native-firebase/auth';

type RouteParams = {
  CreateOrder: {
    shop: {
      id: string;
      name: string;
      area: string;
      distance: number;
    };
  };
};

const CreateOrderScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'CreateOrder'>>();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [currentItem, setCurrentItem] = useState<LineItem>({
    product_name: '',
    quantity: 0,
    uom: '',
    amount: 0
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'credit'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [gstPercentage, setGstPercentage] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);

  // UOM options
  const uomOptions = [
    { label: 'Select UOM', value: '' },
    { label: 'Pieces', value: 'PCS' },
    { label: 'Kilograms', value: 'KG' },
    { label: 'Liters', value: 'L' },
    { label: 'Boxes', value: 'BOX' },
    { label: 'Dozens', value: 'DOZ' },
    { label: 'Packets', value: 'PKT' }
  ];

  // Payment method options
  const paymentMethodOptions = [
    { label: 'Cash', value: 'cash' },
    { label: 'Online', value: 'online' },
    { label: 'Credit', value: 'credit' }
  ];

  // Payment status options
  const paymentStatusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Completed', value: 'completed' },
    { label: 'Failed', value: 'failed' }
  ];

  if (!route.params?.shop) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Error: No shop data available</Text>
      </SafeAreaView>
    );
  }

  const handleAddItem = () => {
    if (!currentItem.product_name || !currentItem.quantity || !currentItem.uom || !currentItem.amount) {
      Alert.alert('Error', 'Please fill in all item details');
      return;
    }

    if (editingIndex !== null) {
      // Update existing item
      const newItems = [...lineItems];
      newItems[editingIndex] = currentItem;
      setLineItems(newItems);
      setEditingIndex(null);
    } else {
      // Add new item
      setLineItems([...lineItems, currentItem]);
    }

    // Reset form
    setCurrentItem({
      product_name: '',
      quantity: 0,
      uom: '',
      amount: 0
    });
  };

  const handleEditItem = (index: number) => {
    setCurrentItem(lineItems[index]);
    setEditingIndex(index);
  };

  const handleDeleteItem = (index: number) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: () => {
            const newItems = lineItems.filter((_, i) => i !== index);
            setLineItems(newItems);
          },
          style: 'destructive'
        }
      ]
    );
  };

  const calculateTotal = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = (subtotal * discountPercentage) / 100;
    const afterDiscount = subtotal - discountAmount;
    const gstAmount = (afterDiscount * gstPercentage) / 100;
    return afterDiscount + gstAmount;
  };

  const handleCreateOrder = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to create an order');
        return;
      }

      if (lineItems.length === 0) {
        Alert.alert('Error', 'Please add at least one item');
        return;
      }

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const discountAmount = (subtotal * discountPercentage) / 100;
      const afterDiscount = subtotal - discountAmount;
      const gstAmount = (afterDiscount * gstPercentage) / 100;

      const orderData = {
        shop_id: route.params.shop.id,
        shop_name: route.params.shop.name,
        shop_area: route.params.shop.area,
        user_id: currentUser.uid,
        user_email: currentUser.email || '',
        line_items: lineItems,
        subtotal: subtotal,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        gst_percentage: gstPercentage,
        gst_amount: gstAmount,
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
      };

      await createOrder(orderData);
      Alert.alert('Success', 'Order created successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'Failed to create order. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.shopName}>{route.params.shop.name}</Text>
          <Text style={styles.distance}>
            {(route.params.shop.distance / 1000).toFixed(2)} km away
          </Text>
        </View>

        <View style={styles.itemForm}>
          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput
                style={styles.input}
                value={currentItem.product_name}
                onChangeText={(text) => setCurrentItem({ ...currentItem, product_name: text })}
                placeholder="Enter product name"
              />
            </View>

            <TouchableOpacity 
              style={[styles.addButton, editingIndex !== null && styles.editButton]} 
              onPress={handleAddItem}
            >
              <Text style={styles.buttonText}>{editingIndex !== null ? '✓' : '+'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                value={currentItem.quantity.toString()}
                onChangeText={(text) => setCurrentItem({ ...currentItem, quantity: parseFloat(text) || 0 })}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>UOM</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={currentItem.uom}
                  onValueChange={(value) => setCurrentItem({ ...currentItem, uom: value })}
                  style={[styles.picker, { color: '#000000' }]}
                  dropdownIconColor="#000000"
                >
                  {uomOptions.map((option) => (
                    <Picker.Item 
                      key={option.value} 
                      label={option.label} 
                      value={option.value}
                      style={{ 
                        color: '#000000',
                        backgroundColor: '#ffffff',
                        fontSize: 16
                      }}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={currentItem.amount.toString()}
                onChangeText={(text) => setCurrentItem({ ...currentItem, amount: parseFloat(text) || 0 })}
                keyboardType="numeric"
                placeholder="₹0"
              />
            </View>
          </View>
        </View>

        {lineItems.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>GST %</Text>
                <TextInput
                  style={styles.input}
                  value={gstPercentage.toString()}
                  onChangeText={(text) => setGstPercentage(parseFloat(text) || 0)}
                  keyboardType="numeric"
                  placeholder="Enter GST percentage"
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Discount %</Text>
                <TextInput
                  style={styles.input}
                  value={discountPercentage.toString()}
                  onChangeText={(text) => setDiscountPercentage(parseFloat(text) || 0)}
                  keyboardType="numeric"
                  placeholder="Enter discount percentage"
                />
              </View>
            </View>
            
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalAmount}>₹{lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</Text>
            </View>
            {discountPercentage > 0 && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Discount ({discountPercentage}%):</Text>
                <Text style={styles.totalAmount}>-₹{((lineItems.reduce((sum, item) => sum + item.amount, 0) * discountPercentage) / 100).toFixed(2)}</Text>
              </View>
            )}
            {gstPercentage > 0 && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>GST ({gstPercentage}%):</Text>
                <Text style={styles.totalAmount}>₹{((lineItems.reduce((sum, item) => sum + item.amount, 0) * (1 - discountPercentage / 100) * gstPercentage) / 100).toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.totalContainer, styles.finalTotal]}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₹{calculateTotal().toFixed(2)}</Text>
            </View>
          </View>
        )}
        {lineItems.length > 0 && (
          <View style={styles.itemsList}>
            {lineItems.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} {item.uom} × ₹{item.amount}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.editActionButton]}
                    onPress={() => handleEditItem(index)}
                  >
                    <Text style={styles.actionButtonText}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => handleDeleteItem(index)}
                  >
                    <Text style={styles.actionButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={styles.paymentSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}
                style={[styles.picker, { color: '#000000' }]}
                dropdownIconColor="#000000"
              >
                {paymentMethodOptions.map((option) => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value}
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Payment Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={paymentStatus}
                onValueChange={(value) => setPaymentStatus(value as typeof paymentStatus)}
                style={[styles.picker, { color: '#000000' }]}
                dropdownIconColor="#000000"
              >
                {paymentStatusOptions.map((option) => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value}
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={handleCreateOrder}>
          <Text style={styles.buttonText}>Create Order</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  distance: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  itemForm: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  inputContainer: {
    flex: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    elevation: 2,
    height: 50,
  },
  picker: {
    width: '100%',
    backgroundColor: '#ffffff',
    color: '#000000',
    height: 50,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  itemsList: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  itemInfo: {
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editActionButton: {
    backgroundColor: '#007AFF',
  },
  deleteActionButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#34C759',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  finalTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  summaryContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginTop: 15,
    borderRadius: 8,
  },
  paymentSection: {
    marginTop: 16,
    gap: 16,
  },
  createButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    margin: 16,
  },
});

export default CreateOrderScreen;
