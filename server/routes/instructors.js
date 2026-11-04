import express from 'express';
import crypto from 'crypto';
import { writeLimiter } from '../middleware/security.js';
import { storagePath, readJson, writeJson, cleanString, sendServerError } from '../lib/storage.js';

const BOOKINGS_FILE = storagePath('bookings.json');
const PHONE_RE = /^[0-9+().\-\s]{7,20}$/;

const router = express.Router();

// Instructor booking requests. Stored as "requested"; the instructor must confirm.
// NOTE: instructors are not notified yet (needs email/SMS integration).
router.post('/book', writeLimiter, (req, res) => {
  try {
    const body = req.body || {};
    const instructorId = cleanString(body.instructorId, { max: 60, required: true });
    const packageId = cleanString(body.packageId, { max: 60, required: true });
    const studentName = cleanString(body.studentName, { max: 80, required: true });
    const studentPhone = cleanString(body.studentPhone, { max: 20, required: true });
    const timeSlot = cleanString(body.timeSlot, { max: 80, required: true });
    const meetingLocation = cleanString(body.meetingLocation, { max: 120, fallback: '' });
    const notes = cleanString(body.notes, { max: 500, fallback: '' });

    if (!instructorId || !packageId || !studentName || !studentPhone || !timeSlot ||
        meetingLocation === null || notes === null) {
      return res.status(400).json({ error: 'instructorId, packageId, studentName, studentPhone and timeSlot are required' });
    }
    if (!PHONE_RE.test(studentPhone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Permit numbers are sensitive government IDs; they are intentionally not stored.
    const booking = {
      id: `book-${crypto.randomUUID()}`,
      status: 'requested',
      instructorId,
      packageId,
      studentName,
      studentPhone,
      timeSlot,
      meetingLocation,
      notes,
      createdAt: new Date().toISOString()
    };

    const bookings = readJson(BOOKINGS_FILE, []);
    writeJson(BOOKINGS_FILE, [booking, ...(Array.isArray(bookings) ? bookings : [])].slice(0, 10_000));

    res.status(201).json({
      success: true,
      booking: { id: booking.id, status: booking.status, instructorId, packageId, timeSlot, meetingLocation }
    });
  } catch (err) {
    sendServerError(res, 'Failed to save booking request', err);
  }
});

export default router;
