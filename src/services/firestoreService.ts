import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Function to add user data to Firestore
export const addUserToFirestore = async (userData: { name: string; email: string; phoneNumber: string }) => {
  try {
    await firestore().collection('users').add(userData);
    console.log('User added to Firestore!');
  } catch (error) {
    console.error('Error adding user to Firestore: ', error);
  }
};

export const addLocationData = async (
  userId: string,
  journeyId: string, 
  locationData: { 
    latitude: number; 
    longitude: number; 
    accuracy: number; 
    batteryLevel: number;
    eventType: 'day_tracking' | 'shop_in';
    timestamp: string;
  }
) => {
  try {
    const journeyRef = firestore().collection('daily_journeys').doc(`daily_journey_id_${journeyId}`);
    
    // Get the journey document
    const journeyDoc = await journeyRef.get();
    
    // If this is the first location entry for this journey, initialize the journey document
    if (!journeyDoc.exists) {
      const now = firestore.Timestamp.now();
      await journeyRef.set({
        user_id: userId,
        date: now,
        start_time: now,
        end_time: now,
        total_distance: 0,
        tracking_locations: {}
      });
    }

    // Create a new location entry
    const timestamp = firestore.Timestamp.now();
    const locationId = `timestamp_${Date.now()}`;

    // Update the journey document with the new location
    await journeyRef.update({
      end_time: timestamp,
      [`tracking_locations.${locationId}`]: {
        latitude: Number(locationData.latitude.toFixed(6)),
        longitude: Number(locationData.longitude.toFixed(6)),
        timestamp: timestamp,
        accuracy: Number(locationData.accuracy.toFixed(2)),
        battery_level: locationData.batteryLevel,
        event_type: locationData.eventType
      }
    });

    console.log('Location data added successfully:', {
      journeyId,
      locationId,
      eventType: locationData.eventType
    });
  } catch (error) {
    console.error('Error adding location data:', error);
    throw error;
  }
};

// Shop type definition
export interface Shop {
  name: string;
  area: string;
  address: string;
  phoneNumber: string;
  latitude: number;
  longitude: number;
  created_by: string;
  created_at: FirebaseFirestoreTypes.Timestamp;
}

// Function to add a shop to Firestore
export const addShopToFirestore = async (shopData: Omit<Shop, 'created_at'>) => {
  try {
    const shopRef = firestore().collection('shops');
    const timestamp = firestore.Timestamp.now();
    
    await shopRef.add({
      ...shopData,
      created_at: timestamp
    });
    
    console.log('Shop added to Firestore successfully!');
  } catch (error) {
    console.error('Error adding shop to Firestore: ', error);
    throw error;
  }
};

// Function to get user's name by email
export const getUserNameByEmail = async (email: string): Promise<string | null> => {
  try {
    const usersSnapshot = await firestore()
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      return usersSnapshot.docs[0].data().name;
    }
    return null;
  } catch (error) {
    console.error('Error getting user name: ', error);
    return null;
  }
};
