import firebase from '@react-native-firebase/app';

const initializeFirebase = () => {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp();
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

export default initializeFirebase;
