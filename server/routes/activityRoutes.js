import express from 'express';
import { getActivityLogs, getUserActivitySummary } from '../controllers/activityController.js';
import { protect, hrOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, hrOnly, getActivityLogs);
router.get('/user/:userId', protect, hrOnly, getUserActivitySummary);

export default router;