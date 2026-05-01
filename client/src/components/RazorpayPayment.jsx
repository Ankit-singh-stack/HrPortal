import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const RazorpayPayment = ({ amount, description, onPaymentSuccess, onPaymentFailure }) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      if (!amount || amount <= 0) {
        toast.error('Invalid amount');
        return;
      }

      setLoading(true);

      // Load Razorpay script
      const res = await loadRazorpay();
      if (!res) {
        toast.error('Razorpay SDK failed to load');
        return;
      }

      // Create order on backend
      const orderResponse = await api.post('/payment/create-order', {
        amount,
        description,
        receipt: `receipt_${Date.now()}`
      });

      const { orderId, paymentId: paymentRecordId } = orderResponse.data;

      // Razorpay payment options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount * 100, // Amount in paise
        currency: 'INR',
        name: 'HR Portal',
        description: description || 'Payment for HR Portal',
        order_id: orderId,
        handler: async (response) => {
          try {
            // Verify payment on backend
            await api.post('/payment/verify', {
              orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              paymentRecordId
            });

            toast.success('Payment successful!');
            if (onPaymentSuccess) {
              onPaymentSuccess(response);
            }
          } catch (error) {
            toast.error('Payment verification failed');
            if (onPaymentFailure) {
              onPaymentFailure(error);
            }
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.profile?.phone || ''
        },
        theme: {
          color: '#3399cc'
        }
      };

      const paymentObject = new window.Razorpay(options);

      paymentObject.on('payment.failed', async (response) => {
        try {
          await api.post('/payment/failure', {
            orderId,
            paymentRecordId
          });

          toast.error(`Payment failed: ${response.error.description}`);
          if (onPaymentFailure) {
            onPaymentFailure(response.error);
          }
        } catch (error) {
          console.error('Error handling payment failure:', error);
        }
      });

      paymentObject.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {loading ? 'Processing...' : `Pay ₹${amount}`}
    </button>
  );
};

export default RazorpayPayment;
