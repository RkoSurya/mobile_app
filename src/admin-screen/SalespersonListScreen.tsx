import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getAllUsers } from '../services/firestoreService';

type Salesperson = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
};

const SalespersonListScreen = () => {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalespersons();
  }, []);

  const fetchSalespersons = async () => {
    try {
      console.log('Fetching users...');
      const users = await getAllUsers();
      console.log('Raw users data:', users);

      const salespersonList = users.map(user => ({
        id: user.id,
        name: user.name || 'No Name',
        email: user.email || 'No Email',
        phoneNumber: user.phoneNumber || 'No Phone',
        role: user.role || 'salesperson'
      }));

      console.log('Processed users:', salespersonList);
      setSalespersons(salespersonList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching salespersons:', err);
      setError('Failed to load salespersons');
      setLoading(false);
    }
  };

  const renderSalesperson = ({ item }: { item: Salesperson }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <TouchableOpacity 
          style={styles.statusButton}
          onPress={() => {/* Handle status change */}}
        >
          <Text style={styles.statusText}>Active</Text>
        </TouchableOpacity>
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
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchSalespersons}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (salespersons.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noDataText}>No salespersons found</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchSalespersons}
        >
          <Text style={styles.retryText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Salespersons ({salespersons.length})</Text>
      <FlatList
        data={salespersons}
        renderItem={renderSalesperson}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    width: 60,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
    marginBottom: 16,
  },
  noDataText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SalespersonListScreen;
