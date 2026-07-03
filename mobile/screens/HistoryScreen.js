import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { API_URL } from '../config';

export default function HistoryScreen({ refreshKey, token }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/prescriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setPrescriptions(data);
    } catch (err) {
      console.error('Error fetching mobile history:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshKey]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scans Archive</Text>
      <Text style={styles.subtitle}>All previously digitized prescription sheets</Text>

      {loading && prescriptions.length === 0 ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : prescriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyText}>No prescriptions archived yet</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
        >
          {prescriptions.map((rx) => {
            const formattedDate = new Date(rx.uploadedAt).toLocaleDateString();
            return (
              <View key={rx._id} style={styles.archiveCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.patientName}>{rx.patientName || 'Unnamed Patient'}</Text>
                  <Text style={styles.scanDate}>{formattedDate}</Text>
                </View>

                {rx.imageUrl && (
                  <Image 
                    source={{ uri: `${API_URL}${rx.imageUrl}` }} 
                    style={styles.thumbnail} 
                  />
                )}

                <View style={styles.medsList}>
                  <Text style={styles.listLabel}>Scanned Prescription Plan:</Text>
                  {rx.medicines.map((med, i) => (
                    <View key={i} style={styles.medRow}>
                      <Text style={styles.medName}>• {med.name} ({med.dosage})</Text>
                      <Text style={styles.medSchedule}>
                        {med.timesPerDay}x daily for {med.daysCount} days
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 16,
    paddingTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  scroll: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  archiveCard: {
    backgroundColor: '#111726',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  scanDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  thumbnail: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    resizeMode: 'cover',
    backgroundColor: '#000',
    marginBottom: 10,
  },
  medsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
  },
  listLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 6,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  medName: {
    fontSize: 12,
    color: '#F9FAFB',
  },
  medSchedule: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
