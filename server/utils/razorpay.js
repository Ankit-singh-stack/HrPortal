import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const createOrder = async (amount, currency = 'INR', receipt) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture
    };
    
    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error) {
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
  }
};

export const verifyPaymentSignature = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');
  
  return expectedSignature === razorpay_signature;
};

export default razorpayInstance;
