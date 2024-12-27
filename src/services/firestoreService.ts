import firestore from '@react-native-firebase/firestore';

// Function to add user data to Firestore
export const addUserToFirestore = async (userData: { name: string; email: string; phoneNumber: string }) => {
  try {
    await firestore().collection('users').add(userData);
    console.log('User added to Firestore!');
  } catch (error) {
    console.error('Error adding user to Firestore: ', error);
  }
};

export const addLocationData = async (journeyId: string, locationData: { 
  latitude: number; 
  longitude: number; 
  accuracy: number; 
  batteryLevel: number;
  timestamp: string;
}) => {
  try {
    const locationRef = firestore().collection('daily_journeys').doc(`daily_journey_id_${journeyId}`).collection('tracking_locations');

    // Round the current coordinates to 3 decimal places
    const roundedLatitude = Number(locationData.latitude.toFixed(3));
    const roundedLongitude = Number(locationData.longitude.toFixed(3));

    // Get current date in local timezone (without time)
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }); // Format: "December 26, 2024"

    // Get current time in HH:mm format
    const timeString = currentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Add new location data with date and time
    const timestamp = firestore.Timestamp.now();
    await locationRef.add({
      latitude: roundedLatitude,
      longitude: roundedLongitude,
      accuracy: locationData.accuracy,
      batteryLevel: locationData.batteryLevel,
      dateString,
      timeString,
      timestamp,
      createdAt: timestamp
    });

    console.log('Location data added successfully:', {
      dateString,
      timeString,
      latitude: roundedLatitude,
      longitude: roundedLongitude
    });
  } catch (error) {
    console.error('Error adding location data:', error);
    throw error;
  }
};
