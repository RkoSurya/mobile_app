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
  id?: string;
  name: string;
  area: string;
  address: string;
  phoneNumber: string;
  latitude: number;
  longitude: number;
  created_by: string;
  created_at: FirebaseFirestoreTypes.Timestamp;
  distance?: number;
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

// Function to get nearby shops
export const getNearbyShops = async (coords: { latitude: number; longitude: number }): Promise<Shop[]> => {
  try {
    const shopsRef = firestore().collection('shops');
    const snapshot = await shopsRef.get();
    
    // Calculate distance and filter shops within 5km radius
    const nearbyShops = snapshot.docs
      .map(doc => {
        const shopData = doc.data();
        const shop: Shop = {
          id: doc.id,
          name: shopData.name || '',
          area: shopData.area || '',
          address: shopData.address || '',
          phoneNumber: shopData.phoneNumber || '',
          latitude: shopData.latitude || 0,
          longitude: shopData.longitude || 0,
          created_by: shopData.created_by || '',
          created_at: shopData.created_at,
        };
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          shop.latitude,
          shop.longitude
        );
        
        return { ...shop, distance };
      })
      .filter(shop => shop.distance <= 5000) // 5km radius
      .sort((a, b) => a.distance - b.distance);

    console.log('Found nearby shops:', nearbyShops.map(shop => ({
      name: shop.name,
      area: shop.area,
      distance: shop.distance
    })));

    return nearbyShops;
  } catch (error) {
    console.error('Error getting nearby shops:', error);
    throw error;
  }
};

// Haversine formula to calculate distance between two points
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  price: number;
  is_active: boolean;
  created_at: FirebaseFirestoreTypes.Timestamp;
  updated_at: FirebaseFirestoreTypes.Timestamp;
}

// Order Types
export interface LineItem {
  product_name: string;
  quantity: number;
  uom: string;
  amount: number;
}

export interface Order {
  shop_id: string;
  shop_name: string;
  shop_area: string;
  user_id: string;
  user_email: string;
  line_items: LineItem[];
  total_amount: number;
  payment_method: 'cash' | 'online' | 'credit';
  created_at: FirebaseFirestoreTypes.Timestamp;
}

// Function to fetch all active products
export const getActiveProducts = async (): Promise<Product[]> => {
  try {
    const productsSnapshot = await firestore()
      .collection('products')
      .where('is_active', '==', true)
      .get();

    return productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Function to create a new order
export const createOrder = async (orderData: Omit<Order, 'created_at'>) => {
  try {
    const ordersRef = firestore().collection('orders');
    const result = await ordersRef.add({
      ...orderData,
      created_at: firestore.Timestamp.now()
    });
    return result.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const getUserDetails = async (userId: string) => {
  try {
    const userDoc = await firestore().collection('users').doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user details:', error);
    throw error;
  }
};

export const getTodayOrders = async (userId: string) => {
  try {
    // Get start and end of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = firestore.Timestamp.fromDate(today);
    const tomorrowTimestamp = firestore.Timestamp.fromDate(
      new Date(today.getTime() + 24 * 60 * 60 * 1000)
    );

    // Get all orders for this user
    const ordersRef = firestore().collection('orders');
    const snapshot = await ordersRef
      .where('user_id', '==', userId)
      .get();

    // Filter and sort in memory
    const orders = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order & { id: string }))
      .filter(order => {
        const orderTimestamp = order.created_at;
        return orderTimestamp >= todayTimestamp && orderTimestamp < tomorrowTimestamp;
      })
      .sort((a, b) => b.created_at.toMillis() - a.created_at.toMillis());

    console.log('Found orders:', orders.length);
    return orders;
  } catch (error) {
    console.error('Error getting today orders:', error);
    throw error;
  }
};

export const getTodaySummary = async (userId: string) => {
  try {
    const orders = await getTodayOrders(userId);
    console.log('Processing orders for summary:', orders.length);
    
    const summary = {
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
      totalDistance: 0,
      shopSummaries: {} as Record<string, {
        shopName: string;
        area: string;
        orderCount: number;
        totalAmount: number;
        products: Record<string, {
          quantity: number;
          uom: string;
          amount: number;
        }>;
      }>
    };

    // Calculate per-shop summaries
    orders.forEach(order => {
      if (!summary.shopSummaries[order.shop_id]) {
        summary.shopSummaries[order.shop_id] = {
          shopName: order.shop_name,
          area: order.shop_area || '', // Add area from order
          orderCount: 0,
          totalAmount: 0,
          products: {}
        };
      }

      const shopSummary = summary.shopSummaries[order.shop_id];
      shopSummary.orderCount++;
      shopSummary.totalAmount += order.total_amount || 0;

      // Aggregate products
      order.line_items?.forEach(item => {
        if (!shopSummary.products[item.product_name]) {
          shopSummary.products[item.product_name] = {
            quantity: 0,
            uom: item.uom,
            amount: 0
          };
        }
        const product = shopSummary.products[item.product_name];
        product.quantity += item.quantity || 0;
        product.amount += item.amount || 0;
      });
    });

    console.log('Summary generated:', {
      totalOrders: summary.totalOrders,
      totalAmount: summary.totalAmount,
      shopCount: Object.keys(summary.shopSummaries).length,
      shops: Object.values(summary.shopSummaries).map(shop => ({
        name: shop.shopName,
        area: shop.area
      }))
    });

    return summary;
  } catch (error) {
    console.error('Error getting today summary:', error);
    throw error;
  }
};
