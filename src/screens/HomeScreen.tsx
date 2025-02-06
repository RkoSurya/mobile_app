import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '../types/navigation';
import { useOrders } from '../context/OrderContext';
import EndDayModal from '../components/EndDayModal';

const { width } = Dimensions.get('window');

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

  const handleBack = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Home</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.startDayButton} onPress={handleStartDay}>
            <Text style={styles.buttonText}>🚀 Start Day</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.startDayButton, styles.endDayButton]}
            onPress={() => setEndDayModalVisible(true)}
          >
            <Text style={styles.buttonText}>🏁 End Day</Text>
          </TouchableOpacity>
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  startDayButton: {
    width: width * 0.8,
    height: 56,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default HomeScreen;
