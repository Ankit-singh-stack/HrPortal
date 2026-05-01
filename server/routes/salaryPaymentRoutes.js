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
import { auth } from '../middleware/auth.js';

const router = express.Router();

// HR routes - initiating payments
router.post('/initiate', auth, initiateSalaryPayment);
router.get('/initiated', auth, getInitiatedPayments);
router.delete('/:salaryId/cancel', auth, cancelSalaryPayment);
router.get('/statistics', auth, getPaymentStatistics);

// Employee routes - confirming payments
router.post('/confirm', auth, confirmSalaryPayment);
router.get('/pending', auth, getPendingSalaryPayments);
router.get('/:salaryId/details', auth, getSalaryPaymentDetails);

export default router;
