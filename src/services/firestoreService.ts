import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Function to add user data to Firestore
export const addUserToFirestore = async (userData: { name: string; email: string; phoneNumber: string }, userId: string) => {
  try {
    const userRef = firestore().collection('users').doc(userId);
    const salespersonRef = firestore().collection('salespersons').doc(userId);
    
    // Add basic user data to users collection
    await userRef.set({
      email: userData.email,
      created_at: firestore.Timestamp.now(),
      role: 'salesperson'
    });

    // Add salesperson specific data to salespersons collection
    await salespersonRef.set({
      name: userData.name,
      phoneNumber: userData.phoneNumber,
      isActive: true,
      lastSignIn: firestore.Timestamp.now(),
      lastEndDay: null,
      activityHistory: [],
      endDayHistory: []
    });

    console.log('User added to Firestore!');
  } catch (error) {
    console.error('Error adding user to Firestore: ', error);
    throw error;
  }
};

// Function to add location data to Firestore
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
    distance?: number; 
  }
) => {
  try {
    // Change the document ID to include userId for better data separation
    const journeyRef = firestore()
      .collection('daily_journeys')
      .doc(`${userId}_${journeyId}`);
    
    // Get the journey document
    const journeyDoc = await journeyRef.get();
    
    // Format new coordinates with consistent precision
    const newLatString = Number(locationData.latitude.toFixed(7)).toFixed(7);
    const newLngString = Number(locationData.longitude.toFixed(7)).toFixed(7);
    
    // If this is the first location entry for this journey, initialize the journey document
    if (!journeyDoc.exists) {
      const now = firestore.Timestamp.now();
      await journeyRef.set({
        user_id: userId,
        journey_id: journeyId,
        date: now,
        start_time: now,
        end_time: now,
        total_distance: 0,
        tracking_locations: {}
      });
      
      // First location should always be added
      const firstLocationId = `timestamp_${Date.now()}`;
      await journeyRef.update({
        end_time: now,
        [`tracking_locations.${firstLocationId}`]: {
          latitude: Number(newLatString),
          longitude: Number(newLngString),
          latitude_string: newLatString,
          longitude_string: newLngString,
          timestamp: now,
          accuracy: Number(locationData.accuracy.toFixed(2)),
          battery_level: locationData.batteryLevel,
          event_type: locationData.eventType,
          distance: locationData.distance ? Number(locationData.distance.toFixed(3)) : 0
        }
      });
      console.log('First location data added successfully');
      return;
    }

    // Get the latest location entry
    const journeyData = journeyDoc.data();
    const trackingLocations = journeyData?.tracking_locations || {};
    const locationEntries = Object.entries(trackingLocations);
    
    if (locationEntries.length > 0) {
      // Sort by timestamp to get the latest entry
      const [_, lastLocation] = locationEntries
        .sort(([a], [b]) => parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]))[0];
      
      // Use string comparison for exact precision
      const lastLatString = lastLocation.latitude_string || Number(lastLocation.latitude.toFixed(7)).toFixed(7);
      const lastLngString = lastLocation.longitude_string || Number(lastLocation.longitude.toFixed(7)).toFixed(7);
      
      // Check if location has changed, regardless of event type
      if (lastLatString === newLatString && lastLngString === newLngString) {
        console.log(`Location unchanged for ${locationData.eventType}, skipping update`);
        return;
      }

      // Calculate distance only if location has changed
      const calculatedDistance = calculateDistance(
        Number(lastLatString),
        Number(lastLngString),
        Number(newLatString),
        Number(newLngString)
      );

      // Only update total distance if it's a reasonable value (less than 1km between points)
      // This helps filter out GPS jumps
      if (calculatedDistance > 0 && calculatedDistance < 1000) {
        await journeyRef.update({
          total_distance: firestore.FieldValue.increment(calculatedDistance),
          end_time: firestore.Timestamp.now()
        });
      }
    }

    // Create a new location entry
    const timestamp = firestore.Timestamp.now();
    const locationId = `timestamp_${Date.now()}`;

    // Prepare the update data
    const updateData: any = {
      end_time: timestamp,
      [`tracking_locations.${locationId}`]: {
        latitude: Number(newLatString),
        longitude: Number(newLngString),
        latitude_string: newLatString,
        longitude_string: newLngString,
        timestamp: timestamp,
        accuracy: Number(locationData.accuracy.toFixed(2)),
        battery_level: locationData.batteryLevel,
        event_type: locationData.eventType
      }
    };

    // Only add distance fields if distance is provided
    if (typeof locationData.distance === 'number') {
      updateData[`tracking_locations.${locationId}`].distance = Number(locationData.distance.toFixed(3));
    }

    // Update the journey document
    await journeyRef.update(updateData);

    console.log('Location data added successfully:', {
      userId,
      journeyId,
      locationId,
      eventType: locationData.eventType,
      distance: locationData.distance
    });
  } catch (error) {
    console.error('Error adding location data:', error);
    throw error;
  }
};

// Function to generate a unique journey ID for a user's daily tracking
export const generateJourneyId = (userId: string): string => {
  // Get current date in YYYY-MM-DD format
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  // Combine userId and date to create a unique journey ID
  return `${userId}_${dateStr}`;
};

// Add a new function to get user's journeys
export const getUserJourneys = async (userId: string, date?: Date) => {
  try {
    let query = firestore()
      .collection('daily_journeys')
      .where('user_id', '==', userId)
      .orderBy('date', 'desc');
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .where('date', '>=', firestore.Timestamp.fromDate(startOfDay))
        .where('date', '<=', firestore.Timestamp.fromDate(endOfDay));
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user journeys:', error);
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
      return usersSnapshot.docs[0].data().email;
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
    // Calculate rough bounding box for 100 meters radius
    // 0.0009 degrees is approximately 100 meters at the equator
    const latDelta = 0.0009;
    const lonDelta = 0.0009 / Math.cos(coords.latitude * Math.PI / 180);
    
    const minLat = coords.latitude - latDelta;
    const maxLat = coords.latitude + latDelta;
    const minLon = coords.longitude - lonDelta;
    const maxLon = coords.longitude + lonDelta;

    // Query shops within the bounding box first
    const shopsRef = firestore().collection('shops')
      .where('latitude', '>=', minLat)
      .where('latitude', '<=', maxLat);
    
    const snapshot = await shopsRef.get();
    
    // Then filter more precisely using Haversine formula for exact 100 meters radius
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
        
        // Only calculate distance for shops within the longitude bounds
        if (shop.longitude >= minLon && shop.longitude <= maxLon) {
          // Calculate distance using Haversine formula
          const distance = calculateDistance(
            coords.latitude,
            coords.longitude,
            shop.latitude,
            shop.longitude
          );
          return { ...shop, distance };
        }
        return null;
      })
      .filter((shop): shop is Shop => 
        shop !== null && 
        shop.distance !== undefined && 
        shop.distance <= 100 // 100 meters radius
      )
      .sort((a, b) => (a.distance || 0) - (b.distance || 0)); // Sort by distance

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
export const calculateDistance = (
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
  gstPercentage: number;
  discountPercentage: number;
}

export interface Order {
  shop_id: string;
  shop_name: string;
  shop_area: string;
  user_id: string;
  user_email: string;
  line_items: LineItem[];
  subtotal: number;
  gst_percentage: number;
  gst_amount: number;
  discount_percentage: number;
  discount_amount: number;
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

export const getAllUsers = async () => {
  try {
    // Get all salespersons
    const salespersonsSnapshot = await firestore().collection('salespersons').get();
    const usersSnapshot = await firestore().collection('users').get();
    
    // Create a map of user emails
    const userEmails = new Map(
      usersSnapshot.docs.map(doc => [doc.id, doc.data().email])
    );
    
    // Combine data from both collections
    return salespersonsSnapshot.docs.map(doc => ({
      id: doc.id,
      email: userEmails.get(doc.id) || '',
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

export const updateUserSignInStatus = async (userId: string, isSigningIn: boolean) => {
  try {
    const salespersonRef = firestore().collection('salespersons').doc(userId);
    const timestamp = firestore.Timestamp.now();
    
    const updates: any = {
      isActive: isSigningIn,
      activityHistory: firestore.FieldValue.arrayUnion({
        type: isSigningIn ? 'sign_in' : 'end_day',
        timestamp: timestamp,
        date: timestamp.toDate().toLocaleDateString(),
        time: timestamp.toDate().toLocaleTimeString()
      })
    };

    // Update the appropriate timestamp field
    if (isSigningIn) {
      updates.lastSignIn = timestamp;
    } else {
      updates.lastEndDay = timestamp;
    }

    await salespersonRef.update(updates);
  } catch (error) {
    console.error('Error updating user activity status:', error);
    throw error;
  }
};

export const getUserActivityHistory = async (userId: string) => {
  try {
    const salespersonDoc = await firestore().collection('salespersons').doc(userId).get();
    const salespersonData = salespersonDoc.data();
    return (salespersonData?.activityHistory || []).sort((a, b) => {
      // Sort by timestamp in descending order (newest first)
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.seconds - a.timestamp.seconds;
    });
  } catch (error) {
    console.error('Error getting user activity history:', error);
    throw error;
  }
};

export const endDay = async (userId: string) => {
  try {
    const salespersonRef = firestore().collection('salespersons').doc(userId);
    const endDayTime = firestore.Timestamp.now();
    
    await salespersonRef.update({
      isActive: false,
      lastEndDay: endDayTime,
      endDayHistory: firestore.FieldValue.arrayUnion({
        timestamp: endDayTime,
        date: endDayTime.toDate().toLocaleDateString(),
        time: endDayTime.toDate().toLocaleTimeString()
      }),
      activityHistory: firestore.FieldValue.arrayUnion({
        type: 'end_day',
        timestamp: endDayTime,
        date: endDayTime.toDate().toLocaleDateString(),
        time: endDayTime.toDate().toLocaleTimeString()
      })
    });
  } catch (error) {
    console.error('Error ending day:', error);
    throw error;
  }
};

export const getEndDayHistory = async (userId: string) => {
  try {
    const salespersonDoc = await firestore().collection('salespersons').doc(userId).get();
    const salespersonData = salespersonDoc.data();
    return salespersonData?.endDayHistory || [];
  } catch (error) {
    console.error('Error getting end day history:', error);
    throw error;
  }
};

export const getUserDetails = async (userId: string) => {
  try {
    const [userDoc, salespersonDoc] = await Promise.all([
      firestore().collection('users').doc(userId).get(),
      firestore().collection('salespersons').doc(userId).get()
    ]);
    
    return {
      id: userId,
      email: userDoc.data()?.email,
      ...salespersonDoc.data()
    };
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
    // Get today's orders
    const orders = await getTodayOrders(userId);
    console.log('Processing orders for summary:', orders.length);
    
    // Get today's journey document
    const today = new Date().toISOString().split('T')[0];
    const journeyId = `daily_journey_id_${today}`;  // Using consistent format
    const journeyRef = firestore().collection('daily_journeys').doc(`${userId}_${journeyId}`);
    
    let totalDistance = 0;
    const journeyDoc = await journeyRef.get();
    if (journeyDoc.exists) {
      const journeyData = journeyDoc.data();
      totalDistance = journeyData?.total_distance || 0;
    }
    
    const summary = {
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
      totalDistance: Number(totalDistance),
      totalGstAmount: orders.reduce((sum, order) => sum + (order.gst_amount || 0), 0),
      totalDiscountAmount: orders.reduce((sum, order) => sum + (order.discount_amount || 0), 0),
      shopSummaries: {} as Record<string, {
        shopName: string;
        area: string;
        orderCount: number;
        totalAmount: number;
        subtotal: number;
        gstAmount: number;
        gstPercentage: number;
        discountAmount: number;
        discountPercentage: number;
        products: Record<string, {
          quantity: number;
          uom: string;
          amount: number;
          gstPercentage: number;
          discountPercentage: number;
        }>;
      }>
    };

    // Calculate per-shop summaries
    orders.forEach(order => {
      if (!summary.shopSummaries[order.shop_id]) {
        summary.shopSummaries[order.shop_id] = {
          shopName: order.shop_name,
          area: order.shop_area || '',
          orderCount: 0,
          totalAmount: 0,
          subtotal: 0,
          gstAmount: 0,
          gstPercentage: 0,
          discountAmount: 0,
          discountPercentage: 0,
          products: {}
        };
      }

      const shopSummary = summary.shopSummaries[order.shop_id];
      shopSummary.orderCount++;
      shopSummary.totalAmount += order.total_amount || 0;
      shopSummary.subtotal += order.subtotal || 0;
      shopSummary.gstAmount += order.gst_amount || 0;
      shopSummary.discountAmount += order.discount_amount || 0;

      // Calculate weighted average percentages
      if (order.subtotal > 0) {
        shopSummary.gstPercentage = (shopSummary.gstAmount / shopSummary.subtotal) * 100;
        shopSummary.discountPercentage = (shopSummary.discountAmount / shopSummary.subtotal) * 100;
      }

      // Process each line item
      order.line_items.forEach(item => {
        const productKey = item.product_name;
        if (!shopSummary.products[productKey]) {
          shopSummary.products[productKey] = {
            quantity: 0,
            uom: item.uom,
            amount: 0,
            gstPercentage: item.gstPercentage || 0,
            discountPercentage: item.discountPercentage || 0
          };
        }

        const productSummary = shopSummary.products[productKey];
        productSummary.quantity += item.quantity;
        productSummary.amount += item.amount;
        productSummary.gstPercentage = item.gstPercentage || 0;
        productSummary.discountPercentage = item.discountPercentage || 0;
      });
    });

    // Only log the simplified summary
    const simplifiedSummary = {
      totalOrders: summary.totalOrders,
      totalAmount: summary.totalAmount,
      totalDistance: summary.totalDistance,
      totalGstAmount: summary.totalGstAmount,
      totalDiscountAmount: summary.totalDiscountAmount,
      shopCount: Object.keys(summary.shopSummaries).length,
      shops: Object.values(summary.shopSummaries).map(shop => ({
        name: shop.shopName,
        area: shop.area
      }))
    };
    
    console.log('Summary:', simplifiedSummary);

    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};

// Product related functions
export const saveProduct = async (productName: string) => {
  try {
    const productsRef = firestore().collection('products');
    const searchName = productName.toLowerCase();
    
    const snapshot = await productsRef.where('searchName', '==', searchName).get();
    
    if (snapshot.empty) {
      await productsRef.add({
        name: productName,
        searchName: productName.toLowerCase(), // Store lowercase version for searching
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
};

export const searchProducts = async (searchText: string) => {
  try {
    const productsRef = firestore().collection('products');
    const searchTextLower = searchText.toLowerCase();
    
    const snapshot = await productsRef
      .orderBy('searchName')
      .startAt(searchTextLower)
      .endAt(searchTextLower + '\uf8ff')
      .limit(10)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name, // Return original name with proper case
    }));
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};
