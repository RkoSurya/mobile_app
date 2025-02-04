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
import ShopOrderDetailsScreen from './src/screens/ShopOrderDetailsScreen';
import MapViewScreen from './src/screens/MapViewScreen';
import TodayTrackingScreen from './src/screens/TodayTrackingScreen';
import AdminLoginPage from './src/admin-screen/LoginPage';
import SalespersonListScreen from './src/admin-screen/SalespersonListScreen';
import UserLocationMapScreen from './src/admin-screen/UserLocationMapScreen';

type RootStackParamList = {
  TodayTracking: undefined;
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
  AdminLogin: undefined;
  MapView: {
    shop: {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
    };
    userLocation: {
      latitude: number;
      longitude: number;
    };
    distance: number;
  };
  ShopOrderDetails: {
    shopName: string;
    area: string;
    orders: Array<{
      product_name: string;
      quantity: number;
      uom: string;
      amount: number;
    }>;
    totalAmount: number;
  };
  SalespersonList: undefined;
  UserLocationMap: {
    userName: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <OrderProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Stack.Navigator 
          initialRouteName="TodayTracking"
          screenOptions={{
            headerShown: false,
          }}>
          <Stack.Screen 
            name="TodayTracking" 
            component={TodayTrackingScreen}
            options={{ headerShown: false }}
          />
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
          <Stack.Screen 
            name="MapView" 
            component={MapViewScreen}
            options={{ 
              headerShown: true,
              headerTitle: 'Shop Location',
              headerStyle: {
                backgroundColor: '#4c669f',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen 
            name="ShopOrderDetails" 
            component={ShopOrderDetailsScreen}
            options={{
              headerShown: true,
              title: 'Shop Details',
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
          <Stack.Screen 
            name="AdminLogin" 
            component={AdminLoginPage}
            options={{
              headerShown: true,
              title: 'Admin Login',
              headerStyle: {
                backgroundColor: '#4c669f',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen 
            name="SalespersonList" 
            component={SalespersonListScreen}
            options={{
              headerShown: true,
              title: 'Salespersons',
              headerStyle: {
                backgroundColor: '#4c669f',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen 
            name="UserLocationMap" 
            component={UserLocationMapScreen}
            options={({ route }) => ({
              headerShown: true,
              title: `${route.params.userName}'s Location`,
              headerStyle: {
                backgroundColor: '#4c669f',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </OrderProvider>
  );
}

export default App;