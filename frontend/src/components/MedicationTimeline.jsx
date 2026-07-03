import React, { useState, useEffect } from 'react';
import { Check, Clock, AlertTriangle, HelpCircle, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { API_URL } from '../config';

const MedicationTimeline = ({ refreshKey, token }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Generate 7 days for the header scrollbar starting from 3 days ago to 3 days in future
  const getDaysArray = () => {
    const arr = [];
    const base = new Date(selectedDate);
    // Anchor around today
    const today = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  };

  const days = getDaysArray();

  // Fetch reminders when selectedDate changes
  const fetchReminders = async () => {
    setLoading(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      const response = await fetch(`${API_URL}/api/reminders?date=${dateStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to load reminders');
      }
      const data = await response.json();
      setReminders(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [selectedDate, refreshKey]);

  // Synthesize chord chime utilizing browser's Web Audio API
  const playAdherenceChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      
      // Tone 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: A5 (880 Hz) triggered slightly later for musical harmony
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.08);
      gain2.gain.setValueAtTime(0.08, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } catch (err) {
      console.error('Audio synthesizer error:', err);
    }
  };

  // Toggle adherence status
  const toggleReminderStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'taken' ? 'pending' : 'taken';
    
    // Play chime immediately if marking as taken (Optimistic response)
    if (newStatus === 'taken') {
      playAdherenceChime();
    }

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
        throw new Error('Failed to update status.');
      }

      // Re-fetch to synchronize state
      fetchReminders();
    } catch (err) {
      console.error(err);
      alert('Failed to update reminder status.');
    }
  };

  // Group reminders by time slot
  const getSlot = (timeStr) => {
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 20) return 'Evening';
    return 'Night';
  };

  const slots = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const groupedReminders = reminders.reduce((acc, curr) => {
    const slot = getSlot(curr.time);
    if (!acc[slot]) acc[slot] = [];
    acc[slot].push(curr);
    return acc;
  }, {});

  const totalDoses = reminders.length;
  const takenDoses = reminders.filter(r => r.status === 'taken').length;
  const completionPercentage = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Date Header Picker */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Select Medication Date</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.3rem 0.6rem' }}
              onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(prev.getDate() - 1);
                setSelectedDate(prev);
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.3rem 0.6rem' }}
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 1);
                setSelectedDate(next);
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="date-selector-bar">
          {days.map((day, idx) => {
            const isSelected = day.toDateString() === selectedDate.toDateString();
            const isToday = day.toDateString() === new Date().toDateString();
            const weekday = day.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = day.getDate();

            return (
              <div 
                key={idx}
                className={`day-badge ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDate(day)}
                style={isToday && !isSelected ? { borderColor: 'var(--primary)' } : {}}
              >
                <div className="day-badge-weekday">{isToday ? 'Today' : weekday}</div>
                <div className="day-badge-num">{dayNum}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Adherence Progress Card */}
      {totalDoses > 0 && (
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, rgba(26, 34, 54, 0.9) 0%, rgba(17, 23, 38, 0.9) 100%)', 
          borderLeft: '4px solid var(--accent)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{ background: 'var(--accent-glow)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent)' }}>
              <Award size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '0.15rem' }}>Daily Adherence Score</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                You have taken {takenDoses} of {totalDoses} doses scheduled for today.
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
              {completionPercentage}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Completed
            </div>
          </div>
        </div>
      )}

      {/* Reminders List grouped by time-slot */}
      <div className="timeline-section">
        {loading ? (
          <div className="scanning-spinner-box">
            <div className="spinner"></div>
            <p>Loading schedule...</p>
          </div>
        ) : totalDoses === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)' }}>
            <Clock size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              No medications scheduled
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Scan a new prescription to schedule medications or select a different date.
            </p>
          </div>
        ) : (
          slots.map((slot) => {
            const slotReminders = groupedReminders[slot] || [];
            if (slotReminders.length === 0) return null;

            return (
              <div key={slot} className="timeline-slot active">
                <div className="timeline-slot-header">
                  <Clock size={16} style={{ color: 'var(--primary)' }} />
                  {slot} Schedule
                </div>

                <div className="timeline-grid">
                  {slotReminders.map((reminder) => {
                    const isTaken = reminder.status === 'taken';
                    const isMissed = reminder.status === 'missed';

                    return (
                      <div 
                        key={reminder._id} 
                        className={`timeline-card ${reminder.status}`}
                      >
                        <div className="medicine-info">
                          <h4 style={isTaken ? { textDecoration: 'line-through', color: 'var(--text-secondary)' } : {}}>
                            {reminder.medicineName}
                          </h4>
                          <div className="medicine-details-text">
                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{reminder.time}</span>
                            <span>•</span>
                            <span>{reminder.dosage}</span>
                            {reminder.instructions && (
                              <>
                                <span>•</span>
                                <span style={{ color: 'var(--warning)', fontStyle: 'italic' }}>{reminder.instructions}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="timeline-actions">
                          <button
                            className={`action-checkbox ${isTaken ? 'checked' : ''}`}
                            onClick={() => toggleReminderStatus(reminder._id, reminder.status)}
                            title={isTaken ? "Mark as pending" : "Mark as taken"}
                          >
                            {isTaken && <Check size={14} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default MedicationTimeline;
