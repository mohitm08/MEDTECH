import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';
import DashboardScreen from './screens/DashboardScreen';
import ScannerScreen from './screens/ScannerScreen';
import ReviewScreen from './screens/ReviewScreen';
import HistoryScreen from './screens/HistoryScreen';

// Configure default notification handler behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [currentTab, setCurrentTab] = useState('Dashboard');
  const [scanResult, setScanResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auth States
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');

  // Request native notifications permissions on launch and setup Android channel
  useEffect(() => {
    async function setupNotifications() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Native notification permissions not granted!');
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1A44A0',
        });
      }
    }
    setupNotifications();
  }, []);

  // Restore persistent authentication token on startup
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = await SecureStore.getItemAsync('token');
        const savedUser = await SecureStore.getItemAsync('user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const handleAuthSubmit = async () => {
    setAuthError('');
    if (!email.trim() || !password.trim() || (!isLogin && !name.trim())) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const endpoint = isLogin ? 'login' : 'register';
    const payload = isLogin 
      ? { email: email.trim(), password: password.trim() }
      : { name: name.trim(), email: email.trim(), password: password.trim() };

    try {
      const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed.');
      }
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setAuthError(err.message);
      Alert.alert('Authentication Failed', err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    } catch (err) {
      console.error('Error clearing secure storage:', err);
    }
    setToken(null);
    setUser(null);
    setCurrentTab('Dashboard');
  };

  const handleScanComplete = (result) => {
    setScanResult(result);
    setCurrentTab('Review');
  };

  const handleSaveComplete = async () => {
    // Schedule native device alarms for the saved prescription medicines
    if (scanResult && scanResult.extractedData) {
      await scheduleLocalReminders(scanResult.extractedData);
    }
    
    setScanResult(null);
    setRefreshKey(prev => prev + 1);
    setCurrentTab('Dashboard');
  };

  const handleCancelScan = () => {
    setScanResult(null);
    setCurrentTab('Dashboard');
  };

  // Schedule native OS alerts for future days
  const scheduleLocalReminders = async (extractedData) => {
    try {
      // Clear previously scheduled notifications to avoid double alerts
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      const { medicines } = extractedData;
      if (!medicines) return;

      const now = new Date();

      for (const med of medicines) {
        const days = med.daysCount || 1;
        const times = med.scheduledTimes || ['08:00'];

        for (let dayIdx = 0; dayIdx < days; dayIdx++) {
          const targetDate = new Date();
          targetDate.setDate(now.getDate() + dayIdx);

          for (const timeStr of times) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const triggerDate = new Date(targetDate);
            triggerDate.setHours(hours, minutes, 0, 0);

            // Only schedule if the alarm time is in the future
            if (triggerDate > now) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `Medication Alert: ${med.name}`,
                  body: `${med.dosage} • ${med.instructions || 'Take now'}`,
                  sound: true,
                  priority: Notifications.AndroidNotificationPriority.MAX,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: triggerDate,
                  channelId: 'default',
                },
              });
            }
          }
        }
      }
      console.log('Successfully scheduled future native reminders!');
    } catch (err) {
      console.error('Error scheduling local notifications:', err);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#090D16" />
        <Text style={{ color: '#ffffff', fontSize: 16 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#090D16" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.authScroll}>
            <View style={styles.authCard}>
              <Text style={styles.authLogo}>MEDTECH AI</Text>
              <Text style={styles.authTitle}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={styles.authSubtitle}>
                {isLogin ? 'Sign in to access your prescriptions' : 'Sign up to start scheduling reminders'}
              </Text>

              {!isLogin && (
                <View style={styles.authFormGroup}>
                  <Text style={styles.authLabel}>Full Name</Text>
                  <TextInput
                    style={styles.authInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#6B7280"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              )}

              <View style={styles.authFormGroup}>
                <Text style={styles.authLabel}>Email Address</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#6B7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.authFormGroup}>
                <Text style={styles.authLabel}>Password</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="••••••••"
                  placeholderTextColor="#6B7280"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity style={styles.authBtn} onPress={handleAuthSubmit}>
                <Text style={styles.authBtnText}>
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.authToggle} 
                onPress={() => { setIsLogin(!isLogin); setAuthError(''); }}
              >
                <Text style={styles.authToggleText}>
                  {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />
      
      {/* Top Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>MEDTECH AI</Text>
        <Text style={styles.headerSubtitle}>
          {currentTab === 'Dashboard' && 'Adherence Schedule'}
          {currentTab === 'Scan' && 'OCR Prescription'}
          {currentTab === 'Review' && 'Verification Check'}
          {currentTab === 'History' && 'Prescription Archives'}
        </Text>
      </View>

      {/* Main Screen Panel View */}
      <View style={styles.screenBody}>
        {currentTab === 'Dashboard' && (
          <DashboardScreen 
            refreshKey={refreshKey} 
            onNavigateToScan={() => setCurrentTab('Scan')}
            token={token}
            user={user}
            onLogout={handleLogout}
          />
        )}
        {currentTab === 'Scan' && (
          <ScannerScreen onScanComplete={handleScanComplete} token={token} />
        )}
        {currentTab === 'Review' && scanResult && (
          <ReviewScreen 
            scanResult={scanResult} 
            onSaveComplete={handleSaveComplete}
            onCancel={handleCancelScan}
            token={token}
          />
        )}
        {currentTab === 'History' && (
          <HistoryScreen refreshKey={refreshKey} token={token} />
        )}
      </View>

      {/* Bottom Footer Tab Navigation Bar */}
      {currentTab !== 'Review' && (
        <View style={styles.footerTabs}>
          <TouchableOpacity 
            style={[styles.tabItem, currentTab === 'Dashboard' && styles.tabItemActive]}
            onPress={() => setCurrentTab('Dashboard')}
          >
            <Text style={styles.tabIcon}>🗓️</Text>
            <Text style={[styles.tabLabel, currentTab === 'Dashboard' && styles.tabLabelActive]}>Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabItem, currentTab === 'Scan' && styles.tabItemActive]}
            onPress={() => setCurrentTab('Scan')}
          >
            <Text style={styles.tabIcon}>📷</Text>
            <Text style={[styles.tabLabel, currentTab === 'Scan' && styles.tabLabelActive]}>Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabItem, currentTab === 'History' && styles.tabItemActive]}
            onPress={() => setCurrentTab('History')}
          >
            <Text style={styles.tabIcon}>📁</Text>
            <Text style={[styles.tabLabel, currentTab === 'History' && styles.tabLabelActive]}>Archives</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    backgroundColor: '#111726',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLogo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  screenBody: {
    flex: 1,
  },
  footerTabs: {
    flexDirection: 'row',
    backgroundColor: '#111726',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  tabItemActive: {
    opacity: 1,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#3B82F6',
  },
  authScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#090D16',
  },
  authCard: {
    backgroundColor: '#111726',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  authLogo: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 6,
  },
  authSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  authFormGroup: {
    marginBottom: 16,
  },
  authLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  authInput: {
    backgroundColor: 'rgba(9, 13, 22, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F9FAFB',
    fontSize: 14,
  },
  authBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  authBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  authToggle: {
    alignItems: 'center',
  },
  authToggleText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
});
