import React, { useState, useRef } from 'react';
import { Upload, Camera, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { API_URL } from '../config';

const PrescriptionScanner = ({ onScanComplete, token }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Cycle scanning messages for realism and polished UX
  const triggerScanningMessages = () => {
    const messages = [
      'Reading handwritten text...',
      'Recognizing medical terminologies...',
      'Extracting medicine names & formulas...',
      'Parsing dosages & frequency rules...',
      'Formatting prescription timetable...'
    ];
    let idx = 0;
    setScanMessage(messages[0]);
    const interval = setInterval(() => {
      idx++;
      if (idx < messages.length) {
        setScanMessage(messages[idx]);
      } else {
        clearInterval(interval);
      }
    }, 800);
    return interval;
  };

  // Handle local file selections
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setCameraError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setCameraError(null);
    }
  };

  // Camera API integration
  const startCamera = async () => {
    setCameraActive(true);
    setCameraError(null);
    setImage(null);
    setPreview(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setCameraError('Unable to access device camera. Please upload an image instead.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], "captured_prescription.jpg", { type: "image/jpeg" });
        setImage(file);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
      }, 'image/jpeg');
    }
  };

  // Perform upload and OCR extraction
  const handleScan = async () => {
    if (!image) return;

    setIsScanning(true);
    const msgInterval = triggerScanningMessages();

    try {
      const formData = new FormData();
      formData.append('image', image);

      const response = await fetch(`${API_URL}/api/prescriptions/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Server scan failure.');
      }

      const result = await response.json();
      
      clearInterval(msgInterval);
      setIsScanning(false);
      onScanComplete(result);
    } catch (err) {
      console.error('OCR Error:', err);
      clearInterval(msgInterval);
      setIsScanning(false);
      alert(err.message || 'Failed to scan prescription. Make sure the backend server is running.');
    }
  };

  const resetScanner = () => {
    setImage(null);
    setPreview(null);
    stopCamera();
    setCameraError(null);
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Camera style={{ color: 'var(--primary)' }} />
        Capture or Upload Prescription
      </h2>

      {!preview && !cameraActive && (
        <div 
          className="dropzone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={48} style={{ color: 'var(--text-muted)' }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              Drag & drop prescription image here
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Supports JPG, PNG, WEBP files
            </p>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>— OR —</p>
          <div style={{ display: 'flex', gap: '1rem' }} onClick={e => e.stopPropagation()}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={startCamera}
            >
              <Camera size={18} />
              Use Camera
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>
      )}

      {cameraActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="camera-preview-container">
            <video ref={videoRef} autoPlay playsInline className="camera-video"></video>
            <div className="scan-overlay">
              <div className="scan-laser"></div>
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={capturePhoto}>
              Capture Photo
            </button>
            <button className="btn btn-secondary" onClick={stopCamera}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
          <ShieldAlert style={{ color: 'var(--danger)' }} />
          <p style={{ fontSize: '0.9rem' }}>{cameraError}</p>
        </div>
      )}

      {preview && !isScanning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="camera-preview-container">
            <img 
              src={preview} 
              alt="Prescription Preview" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-accent" onClick={handleScan}>
              <RefreshCw size={18} />
              Scan & Extract Details
            </button>
            <button className="btn btn-secondary" onClick={resetScanner}>
              <X size={18} />
              Clear
            </button>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="scanning-spinner-box">
          <div className="camera-preview-container" style={{ maxHeight: '250px' }}>
            <img 
              src={preview} 
              alt="Prescription Scanning" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.6 }} 
            />
            <div className="scan-overlay">
              <div className="scan-laser"></div>
            </div>
          </div>
          <div className="spinner"></div>
          <h3 style={{ fontFamily: 'var(--font-display)' }}>Analyzing Prescription</h3>
          <p style={{ color: 'var(--accent)', fontWeight: 500, minHeight: '24px' }}>{scanMessage}</p>
        </div>
      )}
    </div>
  );
};

export default PrescriptionScanner;
