import { createOrder, verifyPaymentSignature } from '../utils/razorpay.js';
import { ActivityLog } from '../models/ActivityLog.js';
import mongoose from 'mongoose';

// Payment model for storing payment history
const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: String,
  paymentId: String,
  signature: String,
  amount: Number,
  currency: String,
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  description: String,
  receipt: String
}, { timestamps: true });

export const Payment = mongoose.model('Payment', paymentSchema);

// Create a new payment order
export const createPaymentOrder = async (req, res) => {
  try {
    const { amount, description, receipt } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const order = await createOrder(amount, 'INR', receipt || `order_${userId}_${Date.now()}`);

    // Create payment record
    const payment = await Payment.create({
      userId,
      orderId: order.id,
      amount,
      currency: 'INR',
      status: 'pending',
      description,
      receipt: order.receipt
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify payment and update status
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, paymentRecordId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(orderId, paymentId, signature);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update payment record
    const payment = await Payment.findByIdAndUpdate(
      paymentRecordId,
      {
        paymentId,
        signature,
        status: 'success'
      },
      { new: true }
    );

    // Log activity
    await ActivityLog.create({
      userId,
      action: 'PAYMENT_SUCCESS',
      details: {
        orderId,
        paymentId,
        amount: payment.amount,
        description: payment.description
      }
    });

    res.json({
      message: 'Payment verified successfully',
      payment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Handle failed payment
export const handlePaymentFailure = async (req, res) => {
  try {
    const { orderId, paymentRecordId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const payment = await Payment.findByIdAndUpdate(
      paymentRecordId,
      { status: 'failed' },
      { new: true }
    );

    await ActivityLog.create({
      userId,
      action: 'PAYMENT_FAILED',
      details: {
        orderId,
        amount: payment.amount
      }
    });

    res.json({
      message: 'Payment failure recorded',
      payment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get payment details
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const payment = await Payment.findOne({ _id: paymentId, userId });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
