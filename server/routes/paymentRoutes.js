import express from 'express';
import { 
  createPaymentOrder, 
  verifyPayment, 
  handlePaymentFailure, 
  getPaymentHistory, 
  getPaymentDetails,
  razorpayWebhook 
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Webhook route (No auth middleware, verified via signature)
router.post('/webhook', razorpayWebhook);

// Payment routes
router.post('/create-order', protect, createPaymentOrder);
router.post('/verify', protect, verifyPayment);
router.post('/failure', protect, handlePaymentFailure);
router.get('/history', protect, getPaymentHistory);
router.get('/:paymentId', protect, getPaymentDetails);

export default router;
