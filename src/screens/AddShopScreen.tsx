import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import type { NavigationProp } from '../types/navigation';
import type { Location } from '../types/location';
import { addShopToFirestore, getUserNameByEmail } from '../services/firestoreService';
import auth from '@react-native-firebase/auth';
import Geolocation from '@react-native-community/geolocation';

type AddShopScreenParams = {
  currentLocation?: Location;
};

const AddShopScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<{ params: AddShopScreenParams }, 'params'>>();
  const { currentLocation } = route.params || {};
  const [shopName, setShopName] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    currentLocation ? {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    } : null
  );

  useEffect(() => {
    if (currentLocation) {
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    }
  }, [currentLocation]);

  const handleSubmit = async () => {
    if (!shopName.trim() || !address.trim() || !area.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'All fields are required!');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Location not available. Please try again.');
      return;
    }

    try {
      const currentUser = auth().currentUser;
      if (!currentUser?.email) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const userName = await getUserNameByEmail(currentUser.email);
      
      await addShopToFirestore({
        name: shopName.trim(),
        area: area.trim(),
        address: address.trim(),
        phoneNumber: phoneNumber.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        created_by: userName || currentUser.email,
      });

      Alert.alert(
        'Success',
        'Shop added successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      console.error('Error adding shop:', error);
      Alert.alert('Error', 'Failed to add shop. Please try again.');
    }
  };

  return (
    <LinearGradient
      colors={['#4c669f', '#3b5998', '#192f6a']}
      style={styles.gradient}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Add New Shop</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Shop Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Shop Name"
              placeholderTextColor="#666"
              value={shopName}
              onChangeText={setShopName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Area *</Text>
            <TextInput
              style={styles.input}
              placeholder="Area"
              placeholderTextColor="#666"
              value={area}
              onChangeText={setArea}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Address"
              placeholderTextColor="#666"
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#666"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Add Shop</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddShopScreen;
