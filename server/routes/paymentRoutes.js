import express from 'express';
import { 
  createPaymentOrder, 
  verifyPayment, 
  handlePaymentFailure, 
  getPaymentHistory, 
  getPaymentDetails 
} from '../controllers/paymentController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Payment routes
router.post('/create-order', auth, createPaymentOrder);
router.post('/verify', auth, verifyPayment);
router.post('/failure', auth, handlePaymentFailure);
router.get('/history', auth, getPaymentHistory);
router.get('/:paymentId', auth, getPaymentDetails);

export default router;
