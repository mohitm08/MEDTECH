import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../config';

export default function ScannerScreen({ onScanComplete, token }) {
  const [imageUri, setImageUri] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  // Request media library and camera permissions
  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraPermission.granted && libraryPermission.granted;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera and gallery permissions are required to scan prescriptions.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Gallery permissions are required to select prescriptions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadAndScan = async () => {
    if (!imageUri) return;

    setIsScanning(true);
    setScanStatus('Uploading prescription slip...');

    try {
      // Determine file extension and mime type
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: filename || 'prescription.jpg',
        type
      });

      setScanStatus('Transcribing handwritten notes with Gemini...');
      
      const response = await fetch(`${API_URL}/api/prescriptions/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Server error during scan.');
      }

      const result = await response.json();
      setIsScanning(false);
      onScanComplete(result);
    } catch (err) {
      console.error(err);
      setIsScanning(false);
      Alert.alert(
        'Scan Failed', 
        'Unable to communicate with the OCR backend. Please ensure the Express server is running and configured correctly in config.js.'
      );
    }
  };

  const clearSelectedImage = () => {
    setImageUri(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digitize Prescription</Text>
      <Text style={styles.subtitle}>Take a photo of a doctor slip or upload from your library</Text>

      {!imageUri && !isScanning && (
        <View style={styles.uploadBox}>
          <TouchableOpacity style={styles.optionBtn} onPress={takePhoto}>
            <Text style={styles.optionBtnIcon}>📷</Text>
            <Text style={styles.optionBtnText}>Use Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionBtn, styles.optionBtnSecondary]} onPress={pickFromGallery}>
            <Text style={[styles.optionBtnIcon, styles.textBlue]}>📁</Text>
            <Text style={[styles.optionBtnText, styles.textBlue]}>Browse Photos</Text>
          </TouchableOpacity>
        </View>
      )}

      {imageUri && !isScanning && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtnSecondary} onPress={clearSelectedImage}>
              <Text style={styles.actionBtnTextSecondary}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnPrimary} onPress={uploadAndScan}>
              <Text style={styles.actionBtnTextPrimary}>Scan & Analyze</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isScanning && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingTitle}>Processing Image</Text>
          <Text style={styles.loadingSubtitle}>{scanStatus}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  uploadBox: {
    gap: 15,
  },
  optionBtn: {
    backgroundColor: '#3B82F6',
    padding: 24,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  optionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  optionBtnIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  optionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  textBlue: {
    color: '#3B82F6',
  },
  previewContainer: {
    flex: 1,
    gap: 20,
    maxHeight: '75%',
  },
  previewImage: {
    flex: 1,
    borderRadius: 14,
    resizeMode: 'contain',
    backgroundColor: '#000',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtnPrimary: {
    flex: 2,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionBtnTextSecondary: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    marginTop: 20,
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
});
