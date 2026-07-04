import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  StatusBar 
} from 'react-native';
import { API_URL } from '../config';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ReviewScreen({ scanResult, onSaveComplete, onCancel, token }) {
  const { imageUrl, extractedData } = scanResult;
  const [patientName, setPatientName] = useState(extractedData?.patientName || '');
  const [medicines, setMedicines] = useState(extractedData?.medicines || []);
  const [isSaving, setIsSaving] = useState(false);

  // Time Picker State
  const [showPicker, setShowPicker] = useState(false);
  const [activePickerMedIndex, setActivePickerMedIndex] = useState(null);
  const [activePickerTimeIndex, setActivePickerTimeIndex] = useState(null);

  const openTimePicker = (medIndex, timeIndex) => {
    setActivePickerMedIndex(medIndex);
    setActivePickerTimeIndex(timeIndex);
    setShowPicker(true);
  };

  const onPickerChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate && activePickerMedIndex !== null && activePickerTimeIndex !== null) {
      const hours = String(selectedDate.getHours()).padStart(2, '0');
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      handleTimeChange(activePickerMedIndex, activePickerTimeIndex, timeStr);
    }
    if (Platform.OS !== 'ios') {
      setActivePickerMedIndex(null);
      setActivePickerTimeIndex(null);
    }
  };

  const getPickerDate = () => {
    if (activePickerMedIndex !== null && activePickerTimeIndex !== null) {
      const timeStr = medicines[activePickerMedIndex].scheduledTimes[activePickerTimeIndex];
      if (timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
      }
    }
    return new Date();
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    
    if (field === 'timesPerDay') {
      const num = parseInt(value, 10) || 1;
      updated[index].timesPerDay = num;
      
      // Resize scheduledTimes array
      const defaultTimes = ['08:00', '20:00', '13:00', '18:00'];
      const currentTimes = updated[index].scheduledTimes || [];
      if (currentTimes.length < num) {
        const added = defaultTimes.slice(currentTimes.length, num);
        updated[index].scheduledTimes = [...currentTimes, ...added].slice(0, num);
      } else {
        updated[index].scheduledTimes = currentTimes.slice(0, num);
      }
    } else if (field === 'daysCount') {
      updated[index].daysCount = parseInt(value, 10) || 1;
    } else {
      updated[index][field] = value;
    }
    
    setMedicines(updated);
  };

  const handleTimeChange = (medIndex, timeIndex, value) => {
    const updated = [...medicines];
    updated[medIndex].scheduledTimes[timeIndex] = value;
    setMedicines(updated);
  };

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      {
        name: '',
        dosage: '',
        frequency: 'Once daily',
        duration: '5 days',
        timesPerDay: 1,
        daysCount: 5,
        instructions: 'Take after food',
        scheduledTimes: ['08:00']
      }
    ]);
  };

  const removeMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const savePrescription = async () => {
    if (medicines.length === 0) {
      Alert.alert('Error', 'Please include at least one medicine.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/prescriptions/save`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageUrl,
          patientName,
          medicines,
          rawExtraction: JSON.stringify(extractedData)
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Save failed');
      }

      setIsSaving(false);
      Alert.alert('Success', 'Prescription saved and medication reminders scheduled.');
      onSaveComplete();
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      Alert.alert('Save Failed', err.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Review Extracted Data</Text>
        <Text style={styles.subtitle}>Verify and adjust prescription details below</Text>

        {/* Patient Name Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Patient Name</Text>
          <TextInput 
            style={styles.input} 
            value={patientName} 
            onChangeText={setPatientName} 
            placeholder="Enter patient name"
            placeholderTextColor="#6B7280"
          />
        </View>

        {/* Medicines Section */}
        <View style={styles.medicinesHeader}>
          <Text style={styles.sectionTitle}>Prescribed Medicines</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addMedicine}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {medicines.map((med, index) => (
          <View key={index} style={styles.medCard}>
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedicine(index)}>
              <Text style={styles.removeBtnText}>✕ Delete</Text>
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 2 }]}>
                <Text style={styles.label}>Name</Text>
                <TextInput 
                  style={styles.input} 
                  value={med.name} 
                  onChangeText={v => handleMedicineChange(index, 'name', v)}
                  placeholder="e.g. Paracetamol"
                  placeholderTextColor="#6B7280"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Dosage</Text>
                <TextInput 
                  style={styles.input} 
                  value={med.dosage} 
                  onChangeText={v => handleMedicineChange(index, 'dosage', v)}
                  placeholder="e.g. 500mg"
                  placeholderTextColor="#6B7280"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Times/Day</Text>
                <TextInput 
                  style={styles.input} 
                  value={String(med.timesPerDay)} 
                  keyboardType="numeric"
                  onChangeText={v => handleMedicineChange(index, 'timesPerDay', v)}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Days Count</Text>
                <TextInput 
                  style={styles.input} 
                  value={String(med.daysCount)} 
                  keyboardType="numeric"
                  onChangeText={v => handleMedicineChange(index, 'daysCount', v)}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Special Instructions</Text>
              <TextInput 
                style={styles.input} 
                value={med.instructions} 
                onChangeText={v => handleMedicineChange(index, 'instructions', v)}
                placeholder="e.g. Take after food"
                placeholderTextColor="#6B7280"
              />
            </View>

            {/* Scheduled Times List */}
            <View style={styles.timeSection}>
              <Text style={styles.label}>Daily Alert Times</Text>
              <View style={styles.timeGrid}>
                {med.scheduledTimes?.map((time, timeIdx) => (
                  <TouchableOpacity
                    key={timeIdx}
                    style={styles.timeCapsuleButton}
                    onPress={() => openTimePicker(index, timeIdx)}
                  >
                    <Text style={styles.timeCapsuleText}>⏰ {time}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ))}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.btnSecondary} onPress={onCancel} disabled={isSaving}>
            <Text style={styles.btnTextSecondary}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={savePrescription} disabled={isSaving}>
            <Text style={styles.btnTextPrimary}>{isSaving ? 'Saving...' : 'Save & Schedule'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={getPickerDate()}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
          onChange={onPickerChange}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
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
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#111726',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F9FAFB',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  medicinesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  addBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addBtnText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  medCard: {
    backgroundColor: '#111726',
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  removeBtn: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  timeSection: {
    marginTop: 10,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  timeInput: {
    backgroundColor: '#1A2236',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    width: 70,
    textAlign: 'center',
    paddingVertical: 6,
    color: '#F9FAFB',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  btnPrimary: {
    flex: 2,
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnTextSecondary: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  timeCapsuleButton: {
    backgroundColor: '#1A2236',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  timeCapsuleText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '700',
  },
});
