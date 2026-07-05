import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { API_URL } from '../config';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

// Premium Light Healthcare Palette
const THEME = {
  bg: '#F6F8FD',          
  surface: '#FFFFFF',     
  primary: '#1A44A0',     
  primaryLight: '#EEF4FF',
  success: '#10B981',     
  successLight: '#E6FBF3',
  danger: '#EF4444',      
  dangerLight: '#FEE2E2',  
  textMain: '#1E293B',    
  textSub: '#64748B',     
  textMuted: '#94A3B8',   
  border: '#E2E8F0',      
};

const DEFAULT_MEDS = [
  { _id: '1', medicineName: 'Amoxicillin', time: '08:00 AM', dosage: '500 mg', instructions: 'Take with food', status: 'taken' },
  { _id: '2', medicineName: 'Paracetamol', time: '08:30 AM', dosage: '650 mg', instructions: 'After meals', status: 'taken' },
  { _id: '3', medicineName: 'Vitamin D3', time: '01:15 PM', dosage: '1000 IU', instructions: 'Take with milk', status: 'pending' },
  { _id: '4', medicineName: 'Melatonin', time: '09:00 PM', dosage: '5 mg', instructions: 'Before bed', status: 'pending' },
];

export default function DashboardScreen({ refreshKey, token, user, onLogout }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal & Form State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [medTime, setMedTime] = useState('');
  const [instructions, setInstructions] = useState('');

  // Time Picker State
  const [showPicker, setShowPicker] = useState(false);

  const onPickerChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = String(selectedDate.getHours()).padStart(2, '0');
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      setMedTime(`${hours}:${minutes}`);
    }
  };

  const getPickerDate = () => {
    if (medTime) {
      const match = medTime.match(/(\d+):(\d+)/);
      if (match) {
        let hour = parseInt(match[1], 10);
        const isPM = medTime.toUpperCase().includes('PM');
        const isAM = medTime.toUpperCase().includes('AM');
        if (isPM && hour !== 12) hour += 12;
        if (isAM && hour === 12) hour = 0;
        
        const minutes = parseInt(match[2], 10);
        const d = new Date();
        d.setHours(hour, minutes, 0, 0);
        return d;
      }
    }
    return new Date();
  };

  const getCalendarDays = () => {
    const days = [];
    const today = new Date();
    for (let i = -2; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const calendarDays = getCalendarDays();

  const scheduleNotificationsForList = async (remindersList) => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medtech-reminders', {
          name: 'Medication Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1A44A0',
          enableLights: true,
          enableVibration: true,
          showBadge: true,
        });
      }

      // Clear all scheduled notifications first to remove deleted or completed alarms
      await Notifications.cancelAllScheduledNotificationsAsync();

      const now = new Date();
      for (const item of remindersList) {
        if (item.status !== 'pending') continue;

        // Parse scheduledDate and time
        const baseDate = new Date(item.scheduledDate);
        const [hours, minutes] = item.time.split(':').map(Number);
        
        const triggerDate = new Date(baseDate);
        triggerDate.setHours(hours, minutes, 0, 0);

        // Only schedule if the alarm time is in the future
        if (triggerDate > now) {
          await Notifications.scheduleNotificationAsync({
            identifier: item._id, // prevents duplicates
            content: {
              title: `Medication Alert: ${item.medicineName}`,
              body: `${item.dosage} • ${item.instructions || 'Take now'}`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
              channelId: 'medtech-reminders',
            },
          });
        }
      }
      console.log('Successfully updated local notification alarms for the fetched list!');
    } catch (err) {
      console.error('Error scheduling local notifications for list:', err);
    }
  };

  const syncNotificationsForWeek = async () => {
    if (!token) return;
    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);

      const response = await fetch(
        `${API_URL}/api/reminders?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        await scheduleNotificationsForList(data || []);
      }
    } catch (err) {
      console.error('Error syncing notifications for week:', err);
    }
  };

  const fetchReminders = async () => {
    if (!token) return;
    setLoading(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      const response = await fetch(`${API_URL}/api/reminders?date=${dateStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setReminders(data || []);
      syncNotificationsForWeek();
    } catch (err) {
      setReminders(DEFAULT_MEDS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReminders();
    }
  }, [selectedDate, refreshKey, token]);

  const toggleReminderStatus = async (id) => {
    const reminder = reminders.find(r => r._id === id);
    if (!reminder) return;

    const newStatus = reminder.status === 'taken' ? 'pending' : 'taken';

    // Optimistically update local UI state
    setReminders(prev => prev.map(item => {
      if (item._id === id) {
        return { ...item, status: newStatus };
      }
      return item;
    }));

    // Check if it is a real MongoDB ID. Local manual/mock entries do not sync with backend.
    const isMongoDBId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isMongoDBId || !token) return;

    try {
      const response = await fetch(`${API_URL}/api/reminders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to update reminder status');
      }
      syncNotificationsForWeek();
    } catch (err) {
      console.error('Error syncing reminder status:', err);
      // Revert local state if API request fails
      setReminders(prev => prev.map(item => {
        if (item._id === id) {
          return { ...item, status: reminder.status };
        }
        return item;
      }));
      Alert.alert('Sync Error', 'Failed to update reminder status on server.');
    }
  };

  const handleOpenAddModal = () => {
    setMedName('');
    setDosage('');
    setMedTime('09:00');
    setInstructions('');
    setIsModalVisible(true);
  };

  const handleSaveMedication = async () => {
    if (!medName.trim()) {
      Alert.alert("Missing Field", "Please enter a valid Medicine Name.");
      return;
    }

    try {
      const targetDate = selectedDate || new Date();

      const response = await fetch(`${API_URL}/api/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          medicineName: medName.trim(),
          dosage: dosage.trim() || 'As Directed',
          time: medTime.trim() || '09:00',
          instructions: instructions.trim() || 'No special requirements',
          scheduledDate: targetDate.toISOString()
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to save medication');
      }

      const savedReminder = await response.json();
      setReminders(prev => [...prev, savedReminder]);
      syncNotificationsForWeek();
      setIsModalVisible(false);
    } catch (err) {
      console.error('Error saving manual schedule:', err);
      Alert.alert('Save Failed', err.message || 'Could not connect to server.');
    }
  };

  const handleDeleteMedication = (id, name) => {
    Alert.alert(
      "Delete Medication",
      `Are you sure you want to remove ${name} from today's routine?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/reminders/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to delete reminder');
              }
               setReminders(prev => prev.filter(item => item._id !== id));
               syncNotificationsForWeek();
            } catch (err) {
              console.error(err);
              Alert.alert('Delete Failed', err.message);
            }
          }
        }
      ]
    );
  };

  // --- TIME PARSING & BUCKETING LOGIC ---
const getHourFromString = (timeStr) => {
    if (!timeStr) return 9; // Fallback to morning if empty
    
    // Extract the digits before the colon
    const match = timeStr.match(/(\d+):(\d+)/);
    if (!match) return 9; // Fallback if format is totally unrecognized
    
    let hour = parseInt(match[1], 10);
    
    // Handle AM/PM if they exist, otherwise natively trust the 24-hour number
    const isPM = timeStr.toUpperCase().includes('PM');
    const isAM = timeStr.toUpperCase().includes('AM');
    
    if (isPM && hour !== 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    
    return hour;
  };

  const morning = [];
  const afternoon = [];
  const night = [];

  reminders.forEach(item => {
    const hour = getHourFromString(item.time);
    if (hour >= 5 && hour < 12) morning.push(item);
    else if (hour >= 12 && hour < 17) afternoon.push(item);
    else night.push(item);
  });
  // --------------------------------------

  // Helper function to keep JSX clean
  const renderMedicationItem = (item) => {
    const isDone = item.status === 'taken';
    return (
      <View 
        key={item._id}
        style={[styles.premiumMedicationRowItem, isDone && styles.premiumMedicationRowItemCompleted]}
      >
        <TouchableOpacity
          style={styles.medLeftContentLayout}
          onPress={() => toggleReminderStatus(item._id)}
          activeOpacity={0.7}
        >
          <View style={[styles.timeLabelCapsule, isDone && styles.timeLabelCapsuleDone]}>
            <Text style={[styles.timeCapsuleText, isDone && styles.timeCapsuleTextDone]}>{item.time}</Text>
          </View>
          <View style={{ flex: 1, paddingRight: 4 }}>
            <Text style={[styles.medicineMainNameText, isDone && styles.medicineNameTextDone]}>
              {item.medicineName}
            </Text>
            <Text style={styles.medicineSecondaryDetailText} numberOfLines={1}>
              {item.dosage} • {item.instructions}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.rightActionControlsColumn}>
          <TouchableOpacity 
            style={[styles.customRadioStatusMarker, isDone && styles.customRadioStatusMarkerChecked]}
            onPress={() => toggleReminderStatus(item._id)}
            activeOpacity={0.7}
          >
            {isDone && <Text style={styles.radioCheckCheckmarkGraphic}>✓</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.itemMicroDeleteButton}
            onPress={() => handleDeleteMedication(item._id, item.medicineName)}
            activeOpacity={0.6}
          >
            <Text style={styles.deleteEmojiIconGraphic}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const total = reminders.length;
  const taken = reminders.filter(r => r.status === 'taken').length;
  const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.bg} />
      
      {/* Top Profile Header */}
      <View style={styles.topProfileBar}>
        <View style={styles.profileUserInfo}>
          <View style={styles.userAvatarCircle}>
            <Text style={styles.avatarLetter}>{(user?.name || 'User').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.welcomeUserLabel}>Hi {user?.name || 'User'}</Text>
            <Text style={styles.welcomeSubLabel}>Welcome Back 👋</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={styles.notificationBellButton} activeOpacity={0.6}>
            <Text style={{ fontSize: 16 }}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButtonMobile} onPress={onLogout} activeOpacity={0.6}>
            <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollLayoutContent} showsVerticalScrollIndicator={false}>
        
        {/* Metric Highlights Row */}
        <View style={styles.metricRowGrid}>
          <View style={styles.metricCardMini}>
            <View style={[styles.iconFrameTint, { backgroundColor: '#EFF6FF' }]}>
              <Text style={{ fontSize: 16 }}>💊</Text>
            </View>
            <Text style={styles.metricValueTotal}>{total}</Text>
            <Text style={styles.metricTitleLabel}>Today's Doses</Text>
          </View>
          
          <View style={styles.metricCardMini}>
            <View style={[styles.iconFrameTint, { backgroundColor: THEME.successLight }]}>
              <Text style={{ fontSize: 16 }}>✨</Text>
            </View>
            <Text style={[styles.metricValueTotal, { color: THEME.success }]}>{taken}</Text>
            <Text style={styles.metricTitleLabel}>Taken</Text>
          </View>
        </View>

        {/* Horizontal Calendar Strip */}
        <View style={styles.calendarStripSection}>
          <Text style={styles.blockSectionHeaderTitle}>Select Schedule Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {calendarDays.map((day, index) => {
              const isSelected = day.toDateString() === selectedDate.toDateString();
              const weekday = day.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNumber = day.getDate();

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.calendarDayCard, isSelected && styles.calendarDayCardSelected]}
                  onPress={() => setSelectedDate(day)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.calendarDayWeekName, isSelected && styles.textWhite]}>{weekday}</Text>
                  <Text style={[styles.calendarDayNumberDisplay, isSelected && styles.textWhite]}>{dayNumber}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Adherence Banner Card */}
        <View style={styles.progressComplianceCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.progressTitle}>Daily Adherence</Text>
            <Text style={styles.progressSubtitle}>Taken {taken} of {total} doses today</Text>
          </View>
          <View style={styles.percentageCircleBadge}>
            <Text style={styles.percentageTextDisplay}>{percentage}%</Text>
          </View>
        </View>

        {/* Routine Schedule List */}
        <View style={styles.medicationListWrapper}>
          <View style={styles.listHeaderRowFlex}>
            <Text style={styles.blockSectionHeaderTitle}>● Active Routine</Text>
            <TouchableOpacity 
              style={styles.inlineAddRoutineButton} 
              onPress={handleOpenAddModal}
              activeOpacity={0.7}
            >
              <Text style={styles.inlineAddButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <ActivityIndicator size="small" color={THEME.primary} style={{ marginTop: 20 }} />
          ) : total === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No tasks scheduled for today.</Text>
            </View>
          ) : (
            <View>
              {/* MORNING BUCKET */}
              {morning.length > 0 && (
                <>
                  <Text style={styles.sectionTimeHeader}>🌅 Morning</Text>
                  {morning.map(renderMedicationItem)}
                </>
              )}

              {/* AFTERNOON BUCKET */}
              {afternoon.length > 0 && (
                <>
                  <Text style={styles.sectionTimeHeader}>☀️ Afternoon</Text>
                  {afternoon.map(renderMedicationItem)}
                </>
              )}

              {/* NIGHT BUCKET */}
              {night.length > 0 && (
                <>
                  <Text style={styles.sectionTimeHeader}>🌙 Night</Text>
                  {night.map(renderMedicationItem)}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Input Overlay Modal Window Container */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalCenteredWrapper}
        >
          <View style={styles.modalContentCard}>
            <Text style={styles.modalTitleText}>Add New Schedule</Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabelText}>Medicine Name</Text>
              <TextInput 
                style={styles.formTextInputElement}
                placeholder="e.g. Ibuprofen"
                placeholderTextColor={THEME.textMuted}
                value={medName}
                onChangeText={setMedName}
              />
            </View>

            <View style={styles.formRowSplitLayout}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabelText}>Dosage</Text>
                <TextInput 
                  style={styles.formTextInputElement}
                  placeholder="e.g. 400 mg"
                  placeholderTextColor={THEME.textMuted}
                  value={dosage}
                  onChangeText={setDosage}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabelText}>Time</Text>
                <TouchableOpacity 
                  style={[styles.formTextInputElement, { justifyContent: 'center', height: 46 }]}
                  onPress={() => setShowPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: medTime ? THEME.textMain : THEME.textMuted, fontSize: 14 }}>
                    ⏰ {medTime || 'Select Time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabelText}>Instructions</Text>
              <TextInput 
                style={styles.formTextInputElement}
                placeholder="e.g. Take after breakfast"
                placeholderTextColor={THEME.textMuted}
                value={instructions}
                onChangeText={setInstructions}
              />
            </View>

            <View style={styles.modalActionsRowFlex}>
              <TouchableOpacity 
                style={styles.modalCancelButtonLayout} 
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalSaveButtonLayout} 
                onPress={handleSaveMedication}
              >
                <Text style={styles.modalSaveButtonText}>Save Routine</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {showPicker && (
        <DateTimePicker
          value={getPickerDate()}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
          onChange={onPickerChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 0,
  },
  scrollLayoutContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40, 
  },

  // Header Elements
  topProfileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.bg,
  },
  profileUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE2C5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#D97706',
    fontWeight: '800',
    fontSize: 16,
  },
  welcomeUserLabel: {
    fontSize: 13,
    color: THEME.textSub,
    fontWeight: '500',
  },
  welcomeSubLabel: {
    fontSize: 18,
    color: THEME.textMain,
    fontWeight: '700',
  },
  notificationBellButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },

  // Highlight Summary Cards
  metricRowGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
    marginBottom: 24,
  },
  metricCardMini: {
    flex: 1,
    backgroundColor: THEME.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  iconFrameTint: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValueTotal: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.textMain,
    marginBottom: 2,
  },
  metricTitleLabel: {
    fontSize: 13,
    color: THEME.textSub,
    fontWeight: '500',
  },

  // Action Flex Structure Headers
  listHeaderRowFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  blockSectionHeaderTitle: {
    fontSize: 15,
    color: THEME.textMain,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  inlineAddRoutineButton: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  inlineAddButtonText: {
    fontSize: 13,
    color: THEME.primary,
    fontWeight: '700',
  },

  // Horizontal Strip Reel
  calendarStripSection: {
    marginBottom: 24,
  },
  calendarDayCard: {
    width: 58,
    height: 78,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  calendarDayCardSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarDayWeekName: {
    fontSize: 11,
    color: THEME.textSub,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  calendarDayNumberDisplay: {
    fontSize: 18,
    color: THEME.textMain,
    fontWeight: '700',
  },

  // Adherence Percentage Card Elements
  progressComplianceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    padding: 20,
    borderRadius: 22,
    marginBottom: 26,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 12,
    color: '#D1E2FF',
    fontWeight: '500',
  },
  percentageCircleBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  percentageTextDisplay: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Medication Dynamic List Component Row items
  medicationListWrapper: {
    marginBottom: 10,
  },
  sectionTimeHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.textSub,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumMedicationRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.surface,
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  premiumMedicationRowItemCompleted: {
    backgroundColor: '#FAFBFD',
    borderColor: '#EFF2F7',
  },
  medLeftContentLayout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  timeLabelCapsule: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 75,
    alignItems: 'center',
  },
  timeLabelCapsuleDone: {
    backgroundColor: '#F1F5F9',
  },
  timeCapsuleText: {
    fontSize: 11,
    color: THEME.primary,
    fontWeight: '700',
  },
  timeCapsuleTextDone: {
    color: THEME.textMuted,
  },
  medicineMainNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textMain,
    marginBottom: 3,
  },
  medicineNameTextDone: {
    color: THEME.textMuted,
    textDecorationLine: 'line-through',
  },
  medicineSecondaryDetailText: {
    fontSize: 12,
    color: THEME.textSub,
  },

  // Right Actions Track Group
  rightActionControlsColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  customRadioStatusMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRadioStatusMarkerChecked: {
    backgroundColor: THEME.success,
    borderColor: THEME.success,
  },
  radioCheckCheckmarkGraphic: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  itemMicroDeleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: THEME.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteEmojiIconGraphic: {
    fontSize: 13,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    color: THEME.textMuted,
    fontSize: 14,
  },

  // Premium Custom Form Input Window Styles (Modal)
  modalCenteredWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)', 
    paddingHorizontal: 20,
  },
  modalContentCard: {
    width: '100%',
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textMain,
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  formRowSplitLayout: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textSub,
    marginBottom: 6,
  },
  formTextInputElement: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.textMain,
  },
  modalActionsRowFlex: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButtonLayout: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textSub,
  },
  modalSaveButtonLayout: {
    flex: 2,
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  textWhite: { color: '#FFFFFF' },
  logoutButtonMobile: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});