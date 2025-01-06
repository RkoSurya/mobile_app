import firestore from '@react-native-firebase/firestore';
import * as geofirestore from 'geofirestore';

const migrateShopsToGeo = async () => {
  try {
    // Initialize GeoFirestore
    const GeoFirestore = geofirestore.initializeApp(firestore());
    const geoCollection = GeoFirestore.collection('shops');

    // Get all existing shops
    const shopsSnapshot = await firestore().collection('shops').get();
    
    console.log(`Found ${shopsSnapshot.size} shops to migrate`);

    // Migrate each shop
    for (const doc of shopsSnapshot.docs) {
      const shopData = doc.data();
      
      // Create new geopoint format
      const geoData = {
        name: shopData.name,
        area: shopData.area,
        address: shopData.address,
        phoneNumber: shopData.phoneNumber,
        created_by: shopData.created_by,
        created_at: shopData.created_at,
        // The coordinates field is required for GeoFirestore
        coordinates: new firestore.GeoPoint(
          Number(shopData.latitude) || 0,
          Number(shopData.longitude) || 0
        )
      };

      // Add to geofirestore collection
      await geoCollection.doc(doc.id).set(geoData);
      console.log(`Migrated shop: ${shopData.name}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
};

export default migrateShopsToGeo;
