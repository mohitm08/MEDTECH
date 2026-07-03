import React, { useState } from 'react';
import { Save, Plus, Trash2, Calendar, Clock, User, AlertCircle } from 'lucide-react';

const PrescriptionReview = ({ scanResult, onSaveComplete, onCancel, token }) => {
  const { imageUrl, extractedData } = scanResult;
  const [patientName, setPatientName] = useState(extractedData?.patientName || '');
  const [medicines, setMedicines] = useState(extractedData?.medicines || []);
  const [isSaving, setIsSaving] = useState(false);

  // Handle changing specific medicine fields
  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    
    // Automatically recalculate timesPerDay if frequency changes
    if (field === 'timesPerDay') {
      const timesCount = parseInt(value, 10) || 1;
      const currentTimes = updated[index].scheduledTimes || [];
      
      // Resize times array to match count, filling in defaults
      const defaultTimes = ['08:00', '20:00', '13:00', '17:00'];
      if (currentTimes.length < timesCount) {
        const added = defaultTimes
          .slice(currentTimes.length, timesCount)
          .filter(t => !currentTimes.includes(t));
        updated[index].scheduledTimes = [...currentTimes, ...added].slice(0, timesCount);
      } else if (currentTimes.length > timesCount) {
        updated[index].scheduledTimes = currentTimes.slice(0, timesCount);
      }
    }

    setMedicines(updated);
  };

  // Handle scheduled times array adjustments
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

  // Submit verified prescription details to the backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (medicines.length === 0) {
      alert('Please add at least one medicine.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/prescriptions/save', {
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
        throw new Error('Failed to save prescription.');
      }

      setIsSaving(false);
      onSaveComplete();
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      alert('Error saving prescription: ' + err.message);
    }
  };

  return (
    <div className="scanner-container">
      {/* Column 1: Image Preview */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content' }}>
        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          Original Prescription Upload
        </h3>
        <div className="preview-image-box">
          <img src={`http://localhost:5000${imageUrl}`} alt="Prescription" />
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Refer to the original prescription image if you need to double-check any handwriting.
        </p>
      </div>

      {/* Column 2: Digital Form Editor */}
      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Review Extracted Digital Details
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={14} /> Patient Name
            </label>
            <input
              type="text"
              className="form-input"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient name"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: 'var(--text-secondary)' }}>Prescribed Medications</h4>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={addMedicine}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                <Plus size={14} /> Add Medicine
              </button>
            </div>

            {medicines.map((med, index) => (
              <div key={index} className="review-medicine-card">
                <button
                  type="button"
                  className="delete-card-btn"
                  onClick={() => removeMedicine(index)}
                >
                  <Trash2 size={16} />
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Medicine Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={med.name}
                      onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                      required
                      placeholder="e.g. Paracetamol"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dosage</label>
                    <input
                      type="text"
                      className="form-input"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                      required
                      placeholder="e.g. 500mg"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Freq (Text)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                      placeholder="e.g. Twice daily"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Times/Day</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="form-input"
                      value={med.timesPerDay}
                      onChange={(e) => handleMedicineChange(index, 'timesPerDay', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (Text)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={med.duration}
                      onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                      placeholder="e.g. 5 days"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Days (Num)</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className="form-input"
                      value={med.daysCount}
                      onChange={(e) => handleMedicineChange(index, 'daysCount', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Intake Instructions</label>
                  <input
                    type="text"
                    className="form-input"
                    value={med.instructions}
                    onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                    placeholder="e.g. Take after food"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                    <Clock size={12} /> Scheduled Alert Times
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {med.scheduledTimes?.map((time, timeIdx) => (
                      <input
                        key={timeIdx}
                        type="time"
                        className="form-input"
                        style={{ width: 'fit-content', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                        value={time}
                        onChange={(e) => handleTimeChange(index, timeIdx, e.target.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-accent" 
              disabled={isSaving}
            >
              <Save size={18} />
              {isSaving ? 'Scheduling...' : 'Save & Schedule Reminders'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrescriptionReview;
