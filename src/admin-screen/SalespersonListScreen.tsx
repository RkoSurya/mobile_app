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
  Platform,
} from 'react-native';
import { getAllUsers, getUserActivityHistory } from '../services/firestoreService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'custom'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const navigation = useNavigation<NavigationProp>();

  const fetchSalespersons = async () => {
    try {
      setRefreshing(true);
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
      setRefreshing(false);
    } catch (err) {
      console.error('Error fetching salespersons:', err);
      setError('Failed to load salespersons');
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch salespersons when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchSalespersons();
      
      // Set up periodic refresh every 30 seconds
      const refreshInterval = setInterval(fetchSalespersons, 30000);
      
      return () => clearInterval(refreshInterval);
    }, [])
  );

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
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.name}>{item.name || 'No Name'}</Text>
            <Text style={styles.phone}>{item.phoneNumber || 'No Phone'}</Text>
          </View>
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
            <Text style={styles.value}>{item.email || 'No Email'}</Text>
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

  const groupActivitiesByDay = (activities: ActivityRecord[]) => {
    // Filter activities based on dateFilter
    const filteredActivities = activities.filter(activity => {
      if (dateFilter === 'today') {
        const today = new Date().toLocaleDateString();
        return activity.date === today;
      } else if (dateFilter === 'custom') {
        // For custom date filter
        const filterDate = selectedDate.toLocaleDateString();
        return activity.date === filterDate;
      }
      return true;
    });

    const grouped = filteredActivities.reduce((acc, activity) => {
      const date = activity.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(activity);
      return acc;
    }, {} as { [key: string]: ActivityRecord[] });

    // Sort activities within each day by timestamp in descending order
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
    });

    return grouped;
  };

  const renderHistoryModal = () => {
    const groupedActivities = groupActivitiesByDay(activityHistory);
    const sortedDates = Object.keys(groupedActivities).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const filteredDates = sortedDates.filter(date => {
      if (dateFilter === 'all') return true;
      if (dateFilter === 'today') {
        const today = new Date().toLocaleDateString();
        return date === today;
      }
      if (dateFilter === 'custom') {
        return date === selectedDate.toLocaleDateString();
      }
      return true;
    });

    return (
      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Activity History</Text>
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, dateFilter === 'all' && styles.filterButtonActive]}
                  onPress={() => setDateFilter('all')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    dateFilter === 'all' && styles.filterButtonTextActive,
                    { color: dateFilter === 'all' ? '#007AFF' : '#333' }
                  ]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, dateFilter === 'today' && styles.filterButtonActive]}
                  onPress={() => setDateFilter('today')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    dateFilter === 'today' && styles.filterButtonTextActive,
                    { color: dateFilter === 'today' ? '#007AFF' : '#333' }
                  ]}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, dateFilter === 'custom' && styles.filterButtonActive]}
                  onPress={() => {
                    setDateFilter('custom');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={[
                    styles.filterButtonText,
                    dateFilter === 'custom' && styles.filterButtonTextActive,
                    { color: dateFilter === 'custom' ? '#007AFF' : '#333' }
                  ]}>
                    {dateFilter === 'custom' 
                      ? selectedDate.toLocaleDateString()
                      : 'Select Date'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.historyList}>
              {sortedDates.length > 0 ? (
                sortedDates.map(date => (
                  <View key={date} style={styles.dayGroup}>
                    <Text style={styles.dateHeader}>{date}</Text>
                    {groupedActivities[date].map((record, index) => (
                      <View key={index} style={styles.historyItem}>
                        <View style={styles.historyItemLeft}>
                          <Text style={styles.historyType}>
                            {record.type === 'sign_in' ? '🟢 Sign In' : '🔴 End Day'}
                          </Text>
                        </View>
                        <Text style={styles.historyTime}>{record.time}</Text>
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No activities found for selected date</Text>
              )}
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
  };

  const renderDatePickerModal = () => {
    if (!showDatePicker) return null;

    const years = Array.from({ length: 10 }, (_, i) => tempDate.getFullYear() - 5 + i);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const daysInMonth = new Date(
      tempDate.getFullYear(),
      tempDate.getMonth() + 1,
      0
    ).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity 
          style={styles.datePickerOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
            </View>
            <View style={styles.datePickerContent}>
              <View style={styles.quickDates}>
                <TouchableOpacity
                  style={[
                    styles.quickDateOption,
                    tempDate.toDateString() === new Date().toDateString() && styles.quickDateOptionSelected,
                  ]}
                  onPress={() => {
                    const today = new Date();
                    setTempDate(today);
                  }}
                >
                  <Text style={styles.quickDateText}>Today</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateSelectors}>
                {/* Year Selector */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>Year</Text>
                  <ScrollView style={styles.selector}>
                    {years.map(year => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.selectorItem,
                          tempDate.getFullYear() === year && styles.selectorItemSelected
                        ]}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setFullYear(year);
                          setTempDate(newDate);
                        }}
                      >
                        <Text style={[
                          styles.selectorItemText,
                          tempDate.getFullYear() === year && styles.selectorItemTextSelected
                        ]}>{year}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Month Selector */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>Month</Text>
                  <ScrollView style={styles.selector}>
                    {months.map((month, index) => (
                      <TouchableOpacity
                        key={month}
                        style={[
                          styles.selectorItem,
                          tempDate.getMonth() === index && styles.selectorItemSelected
                        ]}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setMonth(index);
                          setTempDate(newDate);
                        }}
                      >
                        <Text style={[
                          styles.selectorItemText,
                          tempDate.getMonth() === index && styles.selectorItemTextSelected
                        ]}>{month}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Day Selector */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>Day</Text>
                  <ScrollView style={styles.selector}>
                    {days.map(day => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.selectorItem,
                          tempDate.getDate() === day && styles.selectorItemSelected
                        ]}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setDate(day);
                          setTempDate(newDate);
                        }}
                      >
                        <Text style={[
                          styles.selectorItemText,
                          tempDate.getDate() === day && styles.selectorItemTextSelected
                        ]}>{day}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    setSelectedDate(tempDate);
                    setDateFilter('custom');
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderDatePickerModal()}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={fetchSalespersons}
          disabled={refreshing}
        >
          <View style={styles.refreshButtonContent}>
            <Icon 
              name="refresh" 
              size={20} 
              color="#007AFF"
              style={[
                styles.refreshIcon,
                refreshing && styles.refreshingIcon
              ]}
            />
            <Text style={styles.refreshText}>Refresh</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salespersons</Text>
      </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  refreshButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshIcon: {
    opacity: 1,
    marginRight: 4,
  },
  refreshText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshingIcon: {
    opacity: 0.5,
    transform: [{ rotate: '180deg' }],
  },
  listContainer: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#666',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    width: 100,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  viewHistoryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: 14,
  },
  filterButtonTextActive: {
    fontWeight: '600',
  },
  historyList: {
    marginBottom: 16,
  },
  dayGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyItemLeft: {
    flex: 1,
  },
  historyType: {
    fontSize: 14,
    color: '#333',
  },
  historyTime: {
    fontSize: 14,
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 360,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  datePickerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  datePickerContent: {
    padding: 16,
  },
  quickDates: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  quickDateOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  quickDateOptionSelected: {
    backgroundColor: '#007AFF',
  },
  quickDateText: {
    color: '#333',
    fontSize: 14,
  },
  dateSelectors: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 200,
  },
  selectorContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  selectorLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  selector: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  selectorItem: {
    padding: 10,
    alignItems: 'center',
  },
  selectorItemSelected: {
    backgroundColor: '#007AFF',
  },
  selectorItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectorItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SalespersonListScreen;
