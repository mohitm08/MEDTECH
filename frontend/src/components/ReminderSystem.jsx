import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { API_URL } from '../config';

const ReminderSystem = ({ onReminderTriggered, token }) => {
  const [notificationPermission, setNotificationPermission] = useState('default');
  const notifiedReminders = useRef(new Set());
  const pollIntervalRef = useRef(null);

  // Request browser notification permissions
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Synthesize soft triple pulse audio alert
  const playAlarmSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const playPulse = (startTime) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, startTime); // D5
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.2);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.25);
        
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      };

      // Play three distinct sound pulses
      playPulse(now);
      playPulse(now + 0.35);
      playPulse(now + 0.7);
    } catch (err) {
      console.error('Failed to play alarm synth:', err);
    }
  };

  // Check today's reminders and match times
  const checkReminders = async () => {
    if (!token) return;
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const response = await fetch(`${API_URL}/api/reminders?date=${todayStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return;
      const reminders = await response.json();

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`; // "HH:MM"

      reminders.forEach((reminder) => {
        // Match reminder scheduled time and ensure it's pending
        if (
          reminder.time === currentTimeStr &&
          reminder.status === 'pending' &&
          !notifiedReminders.current.has(reminder._id)
        ) {
          // Add to notified list to prevent double notifications in the same minute
          notifiedReminders.current.add(reminder._id);

          // Trigger sound
          playAlarmSound();

          // Trigger System HTML5 notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const bodyText = `${reminder.dosage} - ${reminder.instructions || 'Take now'}`;
            new Notification(`Medication Reminder: ${reminder.medicineName}`, {
              body: bodyText,
              icon: '/vite.svg', // Fallback local icon
              tag: reminder._id,
              requireInteraction: true
            });
          }

          // Trigger callback to refresh timeline UI if visible
          if (onReminderTriggered) {
            onReminderTriggered(reminder);
          }
        }
      });
    } catch (err) {
      console.error('Error checking reminders background loop:', err);
    }
  };

  // Start polling
  useEffect(() => {
    if (!token) return;
    checkReminders();
    
    // Poll every 30 seconds
    pollIntervalRef.current = setInterval(checkReminders, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [onReminderTriggered, token]);

  const requestPermissionManual = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    }
  };

  return (
    <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {notificationPermission === 'granted' ? (
          <Bell size={20} style={{ color: 'var(--accent)' }} />
        ) : (
          <BellOff size={20} style={{ color: 'var(--warning)' }} />
        )}
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {notificationPermission === 'granted' ? 'Notification Alert System Active' : 'System Notifications Blocked'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {notificationPermission === 'granted'
              ? 'We will alert you on this device when it is time for your medicine.'
              : 'Please enable notifications in your browser settings to receive alerts.'}
          </div>
        </div>
      </div>
      {notificationPermission !== 'granted' && (
        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={requestPermissionManual}>
          Enable
        </button>
      )}
    </div>
  );
};

export default ReminderSystem;
