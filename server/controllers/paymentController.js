import { createOrder, verifyPaymentSignature, validateWebhookSignature } from '../utils/razorpay.js';
import { Salary } from '../models/Salary.js';
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

// Razorpay Webhook Handler
export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      console.warn('⚠️ Webhook received without signature');
      return res.status(400).json({ message: 'Missing signature' });
    }

    const isValid = validateWebhookSignature(req.body, signature, secret);

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const { event, payload } = req.body;
    console.log(`🔔 Razorpay Webhook received: ${event}`);

    const payment = payload.payment?.entity;
    if (!payment) {
      return res.json({ status: 'ok', message: 'No payment entity found' });
    }

    const orderId = payment.order_id;
    const paymentId = payment.id;

    if (event === 'payment.captured' || event === 'payment.authorized') {
      // 1. Update Generic Payment
      const genericPayment = await Payment.findOne({ orderId });
      if (genericPayment && genericPayment.status !== 'success') {
        genericPayment.status = 'success';
        genericPayment.paymentId = paymentId;
        await genericPayment.save();
        
        await ActivityLog.create({
          userId: genericPayment.userId,
          action: 'PAYMENT_SUCCESS_WEBHOOK',
          details: { orderId, paymentId, amount: genericPayment.amount }
        });
        console.log(`✅ Webhook: Updated generic payment ${orderId}`);
      }

      // 2. Update Salary Payment
      const salary = await Salary.findOne({ paymentOrderId: orderId });
      if (salary && salary.paymentStatus !== 'paid') {
        salary.paymentStatus = 'paid';
        salary.paymentId = paymentId;
        salary.paymentDate = new Date();
        salary.paymentApprovedAt = new Date();
        await salary.save();

        await ActivityLog.create({
          userId: salary.userId,
          action: 'SALARY_PAYMENT_SUCCESS_WEBHOOK',
          details: { salaryId: salary._id, orderId, paymentId, amount: salary.netSalary }
        });
        console.log(`✅ Webhook: Updated salary payment ${orderId}`);
      }
    } else if (event === 'payment.failed') {
      await Payment.findOneAndUpdate({ orderId }, { status: 'failed' });
      await Salary.findOneAndUpdate({ paymentOrderId: orderId }, { paymentStatus: 'failed', failureReason: 'Payment failed via webhook' });
      console.log(`❌ Webhook: Payment failed ${orderId}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};
