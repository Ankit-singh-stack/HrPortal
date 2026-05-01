import express from 'express';
import {
  initiateSalaryPayment,
  confirmSalaryPayment,
  getPendingSalaryPayments,
  getInitiatedPayments,
  getSalaryPaymentDetails,
  cancelSalaryPayment,
  getPaymentStatistics
} from '../controllers/salaryPaymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// HR routes - initiating payments
router.post('/initiate', protect, initiateSalaryPayment);
router.get('/initiated', protect, getInitiatedPayments);
router.delete('/:salaryId/cancel', protect, cancelSalaryPayment);
router.get('/statistics', protect, getPaymentStatistics);

// Employee routes - confirming payments
router.post('/confirm', protect, confirmSalaryPayment);
router.get('/pending', protect, getPendingSalaryPayments);
router.get('/:salaryId/details', protect, getSalaryPaymentDetails);

export default router;
