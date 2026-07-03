import Reminder from '../models/Reminder.js';

/**
 * Pre-generate reminders for a prescription starting from a specific date.
 * For each medicine:
 * - Loops over each day in its duration (daysCount).
 * - Loops over each scheduled time (e.g. ["08:00", "20:00"]).
 * - Creates a Reminder record in MongoDB.
 */
export const generateRemindersForPrescription = async (prescription, startDate) => {
  const reminders = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  for (const medicine of prescription.medicines) {
    const days = medicine.daysCount || 1;
    const times = medicine.scheduledTimes || ["08:00"];

    for (let dayIndex = 0; dayIndex < days; dayIndex++) {
      // Calculate target date
      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + dayIndex);

      for (const time of times) {
        reminders.push({
          prescriptionId: prescription._id,
          userId: prescription.userId,
          medicineName: medicine.name,
          time,
          dosage: medicine.dosage,
          instructions: medicine.instructions,
          status: 'pending',
          scheduledDate: targetDate
        });
      }
    }
  }

  if (reminders.length > 0) {
    await Reminder.insertMany(reminders);
    console.log(`Generated ${reminders.length} reminders for prescription: ${prescription._id}`);
  }
};

/**
 * Get reminders for a specific date (defaulting to today)
 * Query format: GET /api/reminders?date=YYYY-MM-DD
 */
export const getRemindersByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    // Parse target date
    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date);
    }
    
    // Set bounds for the start and end of that specific day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const reminders = await Reminder.find({
      userId: req.user._id,
      scheduledDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ time: 1 });

    res.status(200).json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update the status of a specific reminder
 * PUT /api/reminders/:id/status
 */
export const updateReminderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'pending', 'taken', 'missed'

    if (!['pending', 'taken', 'missed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const updateData = { status };
    if (status === 'taken') {
      updateData.takenAt = new Date();
    } else {
      updateData.takenAt = null;
    }

    const updatedReminder = await Reminder.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updateData,
      { new: true }
    );

    if (!updatedReminder) {
      return res.status(404).json({ message: 'Reminder not found or unauthorized.' });
    }

    res.status(200).json(updatedReminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get a quick adherence summary for dashboard widgets
 * GET /api/reminders/summary
 */
export const getRemindersSummary = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayReminders = await Reminder.find({
      userId: req.user._id,
      scheduledDate: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    const summary = {
      total: todayReminders.length,
      taken: todayReminders.filter(r => r.status === 'taken').length,
      missed: todayReminders.filter(r => r.status === 'missed').length,
      pending: todayReminders.filter(r => r.status === 'pending').length
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error('Error getting reminders summary:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a specific reminder
 * DELETE /api/reminders/:id
 */
export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedReminder = await Reminder.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!deletedReminder) {
      return res.status(404).json({ message: 'Reminder not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Reminder deleted successfully.' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ message: error.message });
  }
};
