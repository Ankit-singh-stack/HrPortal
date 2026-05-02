import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { isPayoutModeEnabled } from './razorpayPayouts.js';

dotenv.config();

// Verify Razorpay keys are configured
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('❌ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in .env file!');
  console.error('Please configure your Razorpay TEST keys (rzp_test_*) for development');
} else {
  console.log(`✅ Razorpay configured: Key ID starts with ${process.env.RAZORPAY_KEY_ID.substring(0, 12)}...`);
}

if (isPayoutModeEnabled()) {
  console.log('✅ RazorpayX payout mode: salaries debit your X account and credit employee banks (RAZORPAYX_ACCOUNT_NUMBER set)');
} else {
  console.log('ℹ️ Salary payments use Checkout unless you set RAZORPAYX_ACCOUNT_NUMBER (+ RazorpayX API keys). Checkout credits your merchant balance, not the employee bank.');
}

export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/** Razorpay allows max 40 chars; alphanumeric + underscore only. */
export function normalizeRazorpayReceipt(receipt) {
  const raw = String(receipt || `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '_');
  if (cleaned.length <= 40) return cleaned;
  // Keep suffix so timestamp / unique tail is not lost
  return cleaned.slice(-40);
}

function razorpayApiErrorMessage(error) {
  if (!error) return 'Unknown error';
  const d = error.error?.description || error.error?.reason;
  if (d) return d;
  if (error.message) return error.message;
  try {
    return JSON.stringify(error.error || error);
  } catch {
    return String(error);
  }
}

export const createOrder = async (amount, currency = 'INR', receipt) => {
  try {
    const rupees = Number(amount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      throw new Error('Invalid amount: amount must be greater than 0');
    }

    const amountPaise = Math.round(rupees * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      throw new Error('Invalid amount: minimum order value is ₹1 (100 paise)');
    }

    const safeReceipt = normalizeRazorpayReceipt(receipt);

    const options = {
      amount: amountPaise,
      currency,
      receipt: safeReceipt,
      payment_capture: 1
    };

    console.log(
      `📦 Creating Razorpay order: ${amountPaise} paise (₹${rupees}), receipt=${safeReceipt} (${safeReceipt.length} chars)`
    );
    const order = await razorpayInstance.orders.create(options);
    console.log(`✅ Order created successfully: ${order.id}`);
    return order;
  } catch (error) {
    const msg = razorpayApiErrorMessage(error);
    console.error('❌ Razorpay Order Creation Error:', msg, error.statusCode || '');
    throw new Error(`Failed to create Razorpay order: ${msg}`);
  }
};

export const verifyPaymentSignature = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  try {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ Missing payment details for verification');
      return false;
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    const isValid = expectedSignature === razorpay_signature;
    
    if (isValid) {
      console.log(`✅ Payment signature verified successfully: ${razorpay_payment_id}`);
    } else {
      console.error(`❌ Payment signature verification failed`);
    }
    
    return isValid;
  } catch (error) {
    console.error(`❌ Signature verification error: ${error.message}`);
    return false;
  }
};

export default razorpayInstance;
