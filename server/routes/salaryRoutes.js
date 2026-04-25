import express from 'express';
import { 
  processSalary, 
  updateSalary, 
  getAllSalaries, 
  getMySalary, 
  getSalaryById,
  markAsPaid,
  getSalaryStats
} from '../controllers/salaryController.js';
import { protect, hrOnly } from '../middleware/auth.js';

const router = express.Router();

// HR routes
router.post('/', protect, hrOnly, processSalary);
router.put('/:id', protect, hrOnly, updateSalary);
router.get('/all', protect, hrOnly, getAllSalaries);
router.put('/:id/pay', protect, hrOnly, markAsPaid);
router.get('/stats', protect, hrOnly, getSalaryStats);

// Employee routes
router.get('/my-salary', protect, getMySalary);
router.get('/:id', protect, getSalaryById);

export default router;