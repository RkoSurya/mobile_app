import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyARkbFjWGbVH-Y6R2gVvLDP4IqZgu1LNeA',
  authDomain: 'test-auth-6df86.firebaseapp.com',
  projectId: 'test-auth-6df86',
  storageBucket: 'test-auth-6df86.appspot.com',
  messagingSenderId: '504118241613',
  appId: '1:504118241613:android:add631804c2ed9234c2f04',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
