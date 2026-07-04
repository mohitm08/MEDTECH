import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicineName: {
    type: String,
    required: true,
    trim: true
  },
  time: {
    type: String, // e.g. "08:00"
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  instructions: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'taken', 'missed'],
    default: 'pending'
  },
  scheduledDate: {
    type: Date, // Date portion only for the specific day
    required: true
  },
  takenAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Create index to easily look up reminders for a specific day
reminderSchema.index({ scheduledDate: 1, status: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);
export default Reminder;
