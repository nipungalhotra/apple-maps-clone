import express from 'express';
import crypto from 'crypto';
import { writeLimiter } from '../middleware/security.js';
import { identify } from '../lib/auth.js';
import { query } from '../db/index.js';
import { cleanString, sendServerError } from '../lib/validation.js';

const PHONE_RE = /^[0-9+().\-\s]{7,20}$/;

const router = express.Router();

// Instructor booking requests. Stored as "requested"; the instructor must confirm.
// NOTE: instructors are not notified yet (needs email/SMS integration).
router.post('/book', writeLimiter, identify, async (req, res) => {
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
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO roadready.instructor_bookings
         (id, owner_id, instructor_id, package_id, student_name, student_phone, time_slot, meeting_location, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, req.ownerId || null, instructorId, packageId, studentName, studentPhone, timeSlot, meetingLocation, notes]
    );

    res.status(201).json({
      success: true,
      booking: { id, status: 'requested', instructorId, packageId, timeSlot, meetingLocation }
    });
  } catch (err) {
    sendServerError(res, 'Failed to save booking request', err);
  }
});

export default router;
