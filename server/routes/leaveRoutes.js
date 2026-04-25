import express from 'express';
import { applyLeave, getLeaves, updateLeaveStatus, getLeaveStats } from '../controllers/leaveController.js';
import { protect, hrOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, applyLeave);
router.get('/', protect, getLeaves);
router.get('/stats', protect, getLeaveStats);
router.put('/:id', protect, hrOnly, updateLeaveStatus);

export default router;