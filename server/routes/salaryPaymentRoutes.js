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
import { protect, hrOnly } from '../middleware/auth.js';

const router = express.Router();

// HR routes - initiating payments
router.post('/initiate', protect, hrOnly, initiateSalaryPayment);
router.get('/initiated', protect, hrOnly, getInitiatedPayments);
router.delete('/:salaryId/cancel', protect, hrOnly, cancelSalaryPayment);
router.get('/statistics', protect, hrOnly, getPaymentStatistics);

// Employee routes - confirming payments
router.post('/confirm', protect, confirmSalaryPayment);
router.get('/pending', protect, getPendingSalaryPayments);
router.get('/:salaryId/details', protect, getSalaryPaymentDetails);

export default router;
