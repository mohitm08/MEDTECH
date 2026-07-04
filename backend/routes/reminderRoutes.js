import express from 'express';
import { getRemindersByDate, updateReminderStatus, getRemindersSummary, deleteReminder, createManualReminder } from '../controllers/reminderController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reminders?date=YYYY-MM-DD
router.get('/', auth, getRemindersByDate);

// POST /api/reminders (Create manual reminder)
router.post('/', auth, createManualReminder);

// GET /api/reminders/summary
router.get('/summary', auth, getRemindersSummary);

// PUT /api/reminders/:id/status
router.put('/:id/status', auth, updateReminderStatus);

// DELETE /api/reminders/:id
router.delete('/:id', auth, deleteReminder);

export default router;
