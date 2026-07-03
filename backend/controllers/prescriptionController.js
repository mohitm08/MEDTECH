import Prescription from '../models/Prescription.js';
import { extractPrescriptionData } from '../services/geminiService.js';
import { generateRemindersForPrescription } from './reminderController.js';

/**
 * Upload prescription image and scan it using the AI Vision Service
 */
export const scanPrescription = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const imagePath = req.file.path;
    const mimeType = req.file.mimetype;

    // Call the Service to extract data via OpenRouter
    const extractedData = await extractPrescriptionData(imagePath, mimeType);

    // Formulate the local asset URL for the image
    const imageUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
      imageUrl,
      extractedData
    });
  } catch (error) {
    console.error('Error scanning prescription:', error);
    res.status(500).json({ message: error.message || 'Error parsing prescription image.' });
  }
};

/**
 * Save confirmed prescription and generate schedule reminders
 */
export const savePrescription = async (req, res) => {
  try {
    let { patientName, medicines, imageUrl, rawExtraction } = req.body;

    if (!imageUrl || !medicines || medicines.length === 0) {
      return res.status(400).json({ message: 'Prescription details and image are required.' });
    }

    // Clean up the incoming frontend data before Mongoose throws validation errors
    medicines = medicines.map(med => ({
      ...med,
      dosage: med.dosage || "Not specified",
      frequency: med.frequency || "Not specified",
      duration: med.duration || "Not specified",
      instructions: med.instructions || "None"
    }));

    // Create new prescription
    const prescription = new Prescription({
      userId: req.user._id,
      imageUrl,
      patientName,
      rawExtraction,
      medicines
    });

    const savedPrescription = await prescription.save();

    // Generate reminders in the database for the entire duration
    const startDate = new Date(); // default to starting today
    await generateRemindersForPrescription(savedPrescription, startDate);

    res.status(201).json({
      message: 'Prescription saved and reminders scheduled successfully!',
      prescription: savedPrescription
    });
  } catch (error) {
    console.error('Error saving prescription:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all prescriptions
 */
export const getPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(prescriptions);
  } catch (error) {
    console.error('Error getting prescriptions:', error);
    res.status(500).json({ message: error.message });
  }
};