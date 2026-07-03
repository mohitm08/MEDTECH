import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    required: true,
    trim: true
  },
  frequency: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    required: true,
    trim: true
  },
  timesPerDay: {
    type: Number,
    required: true,
    default: 1
  },
  daysCount: {
    type: Number,
    required: true,
    default: 1
  },
  instructions: {
    type: String,
    trim: true,
    default: ''
  },
  scheduledTimes: {
    type: [String],
    default: []
  }
});

const prescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  patientName: {
    type: String,
    trim: true,
    default: ''
  },
  rawExtraction: {
    type: String,
    default: ''
  },
  medicines: [medicineSchema]
}, {
  timestamps: true
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
