import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useOrders } from '../context/OrderContext';
import { NavigationProp } from '../types/navigation';

type RouteParams = {
  CreateOrder: {
    shop: {
      id: string;
      name: string;
      distance: number;
    };
  };
};

interface LineItem {
  productCode: string;
  quantity: string;
  price: string;
  uom: string;
}

interface Order {
  shopId: string;
  shopName: string;
  items: LineItem[];
  total: number;
  timestamp: string;
}

const CreateOrderScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { addOrder } = useOrders();
  const route = useRoute<RouteProp<RouteParams, 'CreateOrder'>>();
  
  // Add error handling for route params
  if (!route.params?.shop) {
    console.error('No shop data provided to CreateOrderScreen');
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Error: No shop data available</Text>
      </SafeAreaView>
    );
  }
  
  const { shop } = route.params;

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [currentItem, setCurrentItem] = useState<LineItem>({
    productCode: '',
    quantity: '',
    price: '',
    uom: '',
  });

  const addLineItem = () => {
    if (currentItem.productCode && currentItem.quantity && currentItem.price && currentItem.uom) {
      const newItem = {
        productCode: currentItem.productCode,
        quantity: currentItem.quantity,
        price: currentItem.price,
        uom: currentItem.uom,
      };
      setLineItems([...lineItems, newItem]);
      setCurrentItem({
        productCode: '',
        quantity: '',
        price: '',
        uom: '',
      });
    } else {
      console.error('All fields must be filled out to add a line item.');
    }
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseFloat(item.quantity) || 0);
    }, 0).toFixed(2);
  };

  const handleSubmitOrder = () => {
    const total = lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseFloat(item.quantity) || 0);
    }, 0);

    const order = {
      shopId: shop.id,
      shopName: shop.name,
      items: lineItems,
      total,
      timestamp: new Date().toISOString(),
    } as Order;

    addOrder(order);
    navigation.navigate('NearbyShops');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Create Order for {shop.name}</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Product Code"
            value={currentItem.productCode}
            onChangeText={(text: string) => setCurrentItem({ ...currentItem, productCode: text })}
          />
          
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Quantity"
              value={currentItem.quantity}
              onChangeText={(text: string) => setCurrentItem({ ...currentItem, quantity: text })}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Price"
              value={currentItem.price}
              onChangeText={(text: string) => setCurrentItem({ ...currentItem, price: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={currentItem.uom}
              onValueChange={(value: string) => setCurrentItem({ ...currentItem, uom: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select UOM" value="" />
              <Picker.Item label="Pieces" value="PCS" />
              <Picker.Item label="Kilograms" value="KG" />
              <Picker.Item label="Boxes" value="BOX" />
            </Picker>
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addLineItem}>
          <Text style={styles.addButtonText}>+ Add Line Item</Text>
        </TouchableOpacity>

        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total: ₹{calculateTotal()}</Text>
        </View>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmitOrder}
        >
          <Text style={styles.submitButtonText}>
            Submit Order ({lineItems.length} items)
          </Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
  },
  inputContainer: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
  },
  picker: {
    height: 50,
  },
  addButton: {
    backgroundColor: '#4285f4',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  totalContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#34a853',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
  },
});

export default CreateOrderScreen;
