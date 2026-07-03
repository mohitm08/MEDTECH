import express from 'express';
import upload from '../middleware/upload.js';
import { scanPrescription, savePrescription, getPrescriptions } from '../controllers/prescriptionController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Route to handle image uploading + Gemini OCR scan
router.post('/upload', auth, upload.single('image'), scanPrescription);

// Route to save reviewed/edited prescription details
router.post('/save', auth, savePrescription);

// Route to fetch all saved prescriptions
router.get('/', auth, getPrescriptions);

export default router;
