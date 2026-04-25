import express from 'express';
import { markAttendance, getAttendance, getAttendanceStats, getTodayAttendance } from '../controllers/attendanceController.js';
import { protect, hrOnly } from '../middleware/auth.js';

const router = express.Router();

// Mark attendance for logged-in user
router.post('/', protect, markAttendance);

// Mark attendance for specific user (HR only)
router.post('/user/:userId', protect, hrOnly, markAttendance);

// Get attendance records
router.get('/', protect, getAttendance);

// Get attendance stats
router.get('/stats', protect, getAttendanceStats);

// Get today's attendance (HR only)
router.get('/today', protect, hrOnly, getTodayAttendance);

export default router;