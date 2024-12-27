import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import NearbyShopsScreen from './src/screens/NearbyShopsScreen';
import CreateOrderScreen from './src/screens/CreateOrderScreen';
import { OrderProvider } from './src/context/OrderContext';
import DaySummaryScreen from './src/screens/DaySummaryScreen';
import { Location } from './src/screens/TrackingScreen';
import AddShopScreen from './src/screens/AddShopScreen';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Tracking: undefined;
  NearbyShops: {
    currentLocation: Location | null;
    distance: number;
    time: number;
  };
  CreateOrder: undefined;
  DaySummary: undefined;
  AddShop: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <OrderProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
          }}>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Tracking" 
            component={TrackingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="NearbyShops" 
            component={NearbyShopsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AddShop" 
            component={AddShopScreen}
            options={{ 
              headerShown: true,
              headerTitle: 'Add New Shop',
              headerStyle: {
                backgroundColor: '#4c669f',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen name="CreateOrder" component={CreateOrderScreen} options={{ headerShown: true, title: 'Create Order' }} />
          <Stack.Screen 
            name="DaySummary" 
            component={DaySummaryScreen}
            options={{
              headerShown: false
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </OrderProvider>
  );
}

export default App;