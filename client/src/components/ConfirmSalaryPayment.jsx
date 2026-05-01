import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AlertCircle, CreditCard, Clock, CheckCircle } from 'lucide-react';

const ConfirmSalaryPayment = ({ onPaymentSuccess }) => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/salary-payment/pending');
      setPendingPayments(response.data.pendingPayments || []);
    } catch (error) {
      toast.error('Failed to fetch pending payments');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCompletePayment = async (salary) => {
    try {
      if (processing === salary._id) return;

      setProcessing(salary._id);

      // Load Razorpay script
      const res = await loadRazorpay();
      if (!res) {
        toast.error('Razorpay SDK failed to load');
        return;
      }

      // Razorpay payment options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: salary.netSalary * 100, // Amount in paise
        currency: 'INR',
        name: 'HR Portal - Salary Payment',
        description: `Salary Payment for ${salary.month + 1}/${salary.year}`,
        order_id: salary.paymentOrderId,
        handler: async (response) => {
          try {
            // Verify payment on backend
            const verifyResponse = await api.post('/salary-payment/confirm', {
              salaryId: salary._id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });

            toast.success('Salary payment completed successfully!');
            fetchPendingPayments();

            if (onPaymentSuccess) {
              onPaymentSuccess(verifyResponse.data.salary);
            }
          } catch (error) {
            toast.error(error.response?.data?.message || 'Payment verification failed');
          }
        },
        prefill: {
          contact: ''
        },
        theme: {
          color: '#3399cc'
        }
      };

      paymentObject = new window.Razorpay(options);

      paymentObject.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
      });

      paymentObject.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setProcessing(null);
    }
  };

  let paymentObject;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading pending payments...</p>
        </div>
      </div>
    );
  }

  if (pendingPayments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 bg-green-50 rounded-lg">
          <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
          <p className="text-gray-700 font-medium">No pending salary payments</p>
          <p className="text-sm text-gray-500 mt-1">All your salaries have been paid</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Clock className="text-orange-600" size={24} />
        Pending Salary Payments ({pendingPayments.length})
      </h2>

      <div className="space-y-4">
        {pendingPayments.map((salary) => (
          <div key={salary._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-lg font-semibold">
                  Month {salary.month + 1}/{salary.year}
                </p>
                <p className="text-sm text-gray-600">
                  Initiated on {new Date(salary.paymentInitiatedAt).toLocaleDateString()}
                </p>
              </div>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                {salary.paymentStatus.replace('_', ' ')}
              </span>
            </div>

            <div className="bg-gray-50 p-3 rounded mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Net Salary:</span>
                <span className="text-xl font-bold text-blue-600">
                  ₹{salary.netSalary.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Due Date:</span>
                <span>{new Date(salary.paymentDueDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCompletePayment(salary)}
                disabled={processing === salary._id}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <CreditCard size={18} />
                {processing === salary._id ? 'Processing...' : 'Complete Payment'}
              </button>
            </div>

            {salary.basicSalary && (
              <div className="mt-3 pt-3 border-t text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Basic Salary:</span>
                  <span>₹{salary.basicSalary.toLocaleString()}</span>
                </div>
                {Object.values(salary.allowances || {}).some(v => v > 0) && (
                  <div className="flex justify-between">
                    <span>Allowances:</span>
                    <span>
                      ₹{Object.values(salary.allowances || {})
                        .reduce((sum, v) => sum + v, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                )}
                {Object.values(salary.deductions || {}).some(v => v > 0) && (
                  <div className="flex justify-between text-red-600">
                    <span>Deductions:</span>
                    <span>
                      -₹{Object.values(salary.deductions || {})
                        .reduce((sum, v) => sum + v, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 flex gap-3">
        <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Payment Instructions</p>
          <p>Click "Complete Payment" to proceed with Razorpay. You'll be guided through the payment process.</p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSalaryPayment;
