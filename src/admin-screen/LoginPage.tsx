import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type { NavigationProp } from '../types/navigation';

// Define the type for admin user
type AdminUser = {
  email: string;
  role: string;
  name: string;
};

const LoginPage = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async () => {
    try {
      if (!email || !password || !name || !role) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      // Create user with email and password
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      
      // Store additional user data in Firestore
      await firestore().collection('admins').doc(userCredential.user.uid).set({
        email,
        name,
        role,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Account created successfully!', [
        {
          text: 'OK',
          onPress: () => setIsLogin(true),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert('Error', 'Please enter email and password');
        return;
      }

      // Sign in user
      await auth().signInWithEmailAndPassword(email, password);
      
      // Get user data from Firestore
      const userDoc = await firestore()
        .collection('admins')
        .doc(auth().currentUser?.uid)
        .get();

      if (userDoc.exists) {
        const userData = userDoc.data() as AdminUser;
        Alert.alert('Success', `Welcome ${userData.name}!`, [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SalespersonList'),
          },
        ]);
      } else {
        auth().signOut();
        Alert.alert('Error', 'User not found in admin database');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.loginBox}>
        <Text style={styles.title}>{isLogin ? 'Admin Login' : 'Admin Sign Up'}</Text>
        
        {!isLogin && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Name"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeIconText}>
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Role (admin/manager)"
              placeholderTextColor="#666"
              value={role}
              onChangeText={setRole}
              autoCapitalize="none"
            />
          </View>
        )}

        <TouchableOpacity 
          style={styles.loginButton}
          onPress={isLogin ? handleLogin : handleSignUp}
        >
          <Text style={styles.loginButtonText}>
            {isLogin ? 'Login' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchButton}
          onPress={() => {
            setIsLogin(!isLogin);
            setEmail('');
            setPassword('');
            setName('');
            setRole('admin');
          }}
        >
          <Text style={styles.switchButtonText}>
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loginBox: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    padding: 15,
    color: '#333',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
    marginRight: 5,
  },
  eyeIconText: {
    fontSize: 20,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default LoginPage;
