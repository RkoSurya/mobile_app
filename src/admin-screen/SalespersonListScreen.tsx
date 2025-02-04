import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { getAllUsers, getUserActivityHistory } from '../services/firestoreService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ActivityRecord = {
  type: 'sign_in' | 'end_day';
  timestamp: any;
  date: string;
  time: string;
};

type Salesperson = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  lastSignIn?: any;
  isActive?: boolean;
  lastEndDay?: any;
};

const SalespersonListScreen = () => {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    fetchSalespersons();
  }, []);

  const fetchSalespersons = async () => {
    try {
      const users = await getAllUsers();
      const salespersonList = users.map(user => ({
        id: user.id,
        name: user.name || 'No Name',
        email: user.email || 'No Email',
        phoneNumber: user.phoneNumber || 'No Phone',
        role: user.role || 'salesperson',
        lastSignIn: user.lastSignIn,
        isActive: user.isActive,
        lastEndDay: user.lastEndDay,
      }));

      setSalespersons(salespersonList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching salespersons:', err);
      setError('Failed to load salespersons');
      setLoading(false);
    }
  };

  const handleUserPress = (user: Salesperson) => {
    navigation.navigate('UserLocationMap', {
      userId: user.id,
      userName: user.name
    });
  };

  const showActivityHistory = async (userId: string) => {
    try {
      const history = await getUserActivityHistory(userId);
      setActivityHistory(history);
      setSelectedUserId(userId);
      setShowHistory(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load activity history');
    }
  };

  const renderSalesperson = ({ item }: { item: Salesperson }) => {
    const formatTimestamp = (timestamp: any) => {
      if (!timestamp) return 'Not available';
      try {
        return new Date(timestamp.toDate()).toLocaleString();
      } catch (e) {
        return 'Invalid Date';
      }
    };

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleUserPress(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <View 
            style={[
              styles.statusButton,
              { backgroundColor: item.isActive ? '#4CAF50' : '#FF3B30' }
            ]}
          >
            <Text style={styles.statusText}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{item.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{item.phoneNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Last Sign In:</Text>
            <Text style={styles.value}>{formatTimestamp(item.lastSignIn)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Last End Day:</Text>
            <Text style={styles.value}>{formatTimestamp(item.lastEndDay)}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.viewHistoryButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent triggering the parent onPress
              showActivityHistory(item.id);
            }}
          >
            <Text style={styles.buttonText}>View History</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistoryModal = () => (
    <Modal
      visible={showHistory}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHistory(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Activity History</Text>
          <ScrollView style={styles.historyList}>
            {activityHistory.map((record, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyItemLeft}>
                  <Text style={styles.historyType}>
                    {record.type === 'sign_in' ? '🟢 Sign In' : '🔴 End Day'}
                  </Text>
                  <Text style={styles.historyDate}>{record.date}</Text>
                </View>
                <Text style={styles.historyTime}>{record.time}</Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowHistory(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={salespersons}
        renderItem={renderSalesperson}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
      {renderHistoryModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardBody: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 100,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    flex: 1,
    color: '#333',
  },
  viewHistoryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  historyList: {
    maxHeight: 400,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyItemLeft: {
    flex: 1,
  },
  historyType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyDate: {
    color: '#666',
  },
  historyTime: {
    color: '#666',
    marginLeft: 16,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});

export default SalespersonListScreen;
