import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '../types/navigation';
import { useOrders } from '../context/OrderContext';
import EndDayModal from '../components/EndDayModal';

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { resetDay } = useOrders();
  const [endDayModalVisible, setEndDayModalVisible] = useState(false);

  const handleStartDay = () => {
    navigation.navigate('Tracking', { shouldResume: true });
  };

  const handleEndDay = () => {
    navigation.navigate('DaySummary', { resetDay: resetDay });
    setEndDayModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Home</Text>
        
        <TouchableOpacity style={styles.startDayButton} onPress={handleStartDay}>
          <Text style={styles.startDayText}>🚀 Start Day</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.startDayButton, styles.endDayButton]}
          onPress={() => setEndDayModalVisible(true)}
        >
          <Text style={styles.startDayText}>End Day</Text>
        </TouchableOpacity>

        <EndDayModal
          visible={endDayModalVisible}
          onConfirm={handleEndDay}
          onCancel={() => setEndDayModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 30,
  },
  startDayButton: {
    height: 56,
    backgroundColor: '#22C55E', // Green color
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  endDayButton: {
    backgroundColor: '#ef5350',
    marginTop: 20,
  },
  startDayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default HomeScreen;
