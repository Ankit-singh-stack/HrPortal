import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  FileText, 
  Plus, 
  Edit2, 
  Search,
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  X,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';

const SalaryManagement = () => {
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [stats, setStats] = useState({
    monthlyStats: [],
    summary: {
      totalPayroll: 0,
      averageSalary: 0,
      totalEmployees: 0,
      paidCount: 0,
      pendingCount: 0
    }
  });
  const [loading, setLoading] = useState(false);
  /** When true, after save we call Razorpay (X bank payout or Checkout for UPI/card). */
  const [payNowWithRazorpay, setPayNowWithRazorpay] = useState(true);
  const [formData, setFormData] = useState({
    userId: '',
    basicSalary: 0,
    allowances: {
      houseRent: 0,
      dearness: 0,
      travel: 0,
      medical: 0,
      special: 0,
      other: 0
    },
    deductions: {
      tax: 0,
      providentFund: 0,
      professionalTax: 0,
      loan: 0,
      other: 0
    },
    bonus: 0,
    overtime: {
      hours: 0,
      rate: 0
    },
    paymentMethod: 'bank',
    bankAccount: '',
    payoutAccountNumber: '',
    payoutIfsc: '',
    payoutAccountName: '',
    remarks: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchSalaries();
    fetchStats();
  }, [selectedMonth, selectedYear]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/users');
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    }
  };

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/salary/all', {
        params: { month: selectedMonth, year: selectedYear }
      });
      setSalaries(response.data.salaries || []);
    } catch (error) {
      toast.error('Failed to fetch salaries');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/salary/stats', {
        params: { year: selectedYear }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const calculateNetSalary = () => {
    const totalAllowances = Object.values(formData.allowances).reduce((sum, val) => sum + (val || 0), 0);
    const totalDeductions = Object.values(formData.deductions).reduce((sum, val) => sum + (val || 0), 0);
    const overtimeAmount = (formData.overtime.hours || 0) * (formData.overtime.rate || 0);
    
    return formData.basicSalary + totalAllowances + (formData.bonus || 0) + overtimeAmount - totalDeductions;
  };

  const buildSalaryRowForPayment = (savedRecord, employeeId) => {
    const uid = employeeId || savedRecord.userId?._id || savedRecord.userId;
    const emp = employees.find((e) => String(e._id) === String(uid));
    const userIdObj =
      emp
        ? { _id: emp._id, name: emp.name, email: emp.email }
        : typeof savedRecord.userId === 'object' && savedRecord.userId?.name
          ? savedRecord.userId
          : { _id: uid, name: 'Employee', email: '' };
    return { ...savedRecord, userId: userIdObj };
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const runSalaryRazorpayFlow = async (salary) => {
    const { data } = await axios.post('/salary-payment/initiate', {
      salaryIds: [salary._id]
    });

    const result = data.results[0];
    if (!result.success) {
      throw new Error(result.message);
    }

    if (result.mode === 'payout') {
      toast.success('Salary sent to employee bank via Razorpay (IMPS)');
      fetchSalaries();
      fetchStats();
      return;
    }

    if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
      throw new Error(
        'Missing VITE_RAZORPAY_KEY_ID — add the same Key ID as in Razorpay Dashboard to client/.env and restart the dev server'
      );
    }

    const isLoaded = await loadRazorpay();
    if (!isLoaded) {
      throw new Error('Razorpay Checkout failed to load. Check your network.');
    }

    const employeeName = salary.userId?.name || 'Employee';
    const employeeEmail = salary.userId?.email || '';

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: Math.round(Number(result.amount) * 100),
      currency: 'INR',
      name: 'Payment Portal',
      description: `Payment for ${employeeName} — ${new Date(2000, salary.month).toLocaleString('default', { month: 'long' })} ${salary.year}`,
      order_id: result.orderId,
      handler: async function (response) {
        try {
          await axios.post('/salary-payment/confirm', {
            salaryId: salary._id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature
          });
          toast.success('Payment successful — UPI / card / netbanking');
          fetchSalaries();
          fetchStats();
        } catch (err) {
          console.error('Payment verification failed:', err);
          toast.error(err.response?.data?.message || 'Payment verification failed');
        }
      },
      prefill: {
        name: employeeName,
        email: employeeEmail,
        contact: salary.userId?.profile?.phone || ''
      },
      theme: { color: '#4F46E5' }
    };
    
    console.log('💳 Opening Razorpay Checkout with options:', options);

    console.log('💳 Opening Razorpay Checkout for employee:', employeeName, 'Amount:', result.amount);
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      console.error('❌ Razorpay Payment Failed:', response.error);
      const errorMsg = response.error.description || response.error.reason || 'Payment failed';
      toast.error(`Payment failed: ${errorMsg}`);
    });
    rzp.open();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const net = calculateNetSalary();
    if (!formData.userId) {
      toast.error('Select an employee');
      return;
    }
    if (payNowWithRazorpay && net <= 0) {
      toast.error(
        'Net salary is ₹0. Enter basic salary and allowances (or reduce deductions) before taking payment.'
      );
      return;
    }

    setLoading(true);
    const shouldPayAfterSave = payNowWithRazorpay;
    try {
      const salaryData = {
        ...formData,
        month: selectedMonth,
        year: selectedYear,
        paymentMethod: shouldPayAfterSave ? 'razorpay' : formData.paymentMethod
      };

      let saved;
      if (editingSalary) {
        const res = await axios.put(`/salary/${editingSalary._id}`, salaryData);
        saved = res.data;
        toast.success('Salary updated successfully');
      } else {
        const res = await axios.post('/salary', salaryData);
        saved = res.data;
        toast.success('Salary saved successfully');
      }

      const employeeIdForPay = formData.userId;
      setShowModal(false);
      resetForm();

      if (shouldPayAfterSave) {
        try {
          const row = buildSalaryRowForPayment(saved, employeeIdForPay);
          await runSalaryRazorpayFlow(row);
        } catch (payErr) {
          console.error(payErr);
          toast.error(payErr.message || 'Razorpay payment could not start');
        }
      }

      fetchSalaries();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (salary) => {
    try {
      setLoading(true);
      await runSalaryRazorpayFlow(salary);
    } catch (error) {
      console.error('Payment initiation failed:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      basicSalary: 0,
      allowances: {
        houseRent: 0,
        dearness: 0,
        travel: 0,
        medical: 0,
        special: 0,
        other: 0
      },
      deductions: {
        tax: 0,
        providentFund: 0,
        professionalTax: 0,
        loan: 0,
        other: 0
      },
      bonus: 0,
      overtime: { hours: 0, rate: 0 },
      paymentMethod: 'bank',
      bankAccount: '',
      payoutAccountNumber: '',
      payoutIfsc: '',
      payoutAccountName: '',
      remarks: ''
    });
    setPayNowWithRazorpay(true);
    setEditingSalary(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Payment Management
            </h2>
            <p className="text-gray-400 mt-2">Manage and process payments for platform users</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            + Initiate Payment
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 border border-purple-900/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-400 text-sm">Total Payments</p>
                <p className="text-2xl font-bold text-purple-400">{formatCurrency(stats.summary.totalPayroll)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-900/30 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 border border-blue-900/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-400 text-sm">Average Transaction Value</p>
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.summary.averageSalary)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 border border-green-900/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-400 text-sm">Completed Payments</p>
                <p className="text-2xl font-bold text-green-400">{stats.summary.paidCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 border border-yellow-900/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-400 text-sm">Pending Payments</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.summary.pendingCount}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-900/30 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Select Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Select Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
              >
                {[2023, 2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">&nbsp;</label>
              <button
                onClick={fetchSalaries}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Search Transactions
              </button>
            </div>
          </div>
        </div>

        {/* Salary Table */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-700 to-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Base Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Additional Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Adjustments</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Final Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Payment Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : salaries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400">
                      No salary records found for this month
                    </td>
                  </tr>
                ) : (
                  salaries.map((salary) => {
                    const totalAllowances = Object.values(salary.allowances).reduce((sum, val) => sum + (val || 0), 0);
                    const totalDeductions = Object.values(salary.deductions).reduce((sum, val) => sum + (val || 0), 0);
                    
                    return (
                      <tr key={salary._id} className="hover:bg-gray-700/30 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-white">{salary.userId?.name}</p>
                            <p className="text-xs text-gray-400">{salary.userId?.profile?.designation || 'User'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white">{formatCurrency(salary.basicSalary)}</td>
                        <td className="px-6 py-4 text-green-400">{formatCurrency(totalAllowances)}</td>
                        <td className="px-6 py-4 text-red-400">{formatCurrency(totalDeductions)}</td>
                        <td className="px-6 py-4 text-blue-400 font-bold">{formatCurrency(salary.netSalary)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            salary.paymentStatus === 'paid' ? 'bg-green-900/50 text-green-400' :
                            salary.paymentStatus === 'processed' ? 'bg-yellow-900/50 text-yellow-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {salary.paymentStatus === 'processed' ? 'Completed' : 
                             salary.paymentStatus === 'payment_initiated' ? 'Initiated' :
                             salary.paymentStatus === 'paid' ? 'Successful' :
                             salary.paymentStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingSalary(salary);
                                setFormData({
                                  userId: salary.userId._id,
                                  basicSalary: salary.basicSalary,
                                  allowances: salary.allowances,
                                  deductions: salary.deductions,
                                  bonus: salary.bonus,
                                  overtime: salary.overtime,
                                  paymentMethod: salary.paymentMethod,
                                  bankAccount: salary.bankAccount || '',
                                  payoutAccountNumber: salary.payoutAccountNumber || '',
                                  payoutIfsc: salary.payoutIfsc || '',
                                  payoutAccountName: salary.payoutAccountName || '',
                                  remarks: salary.remarks || ''
                                });
                                setShowModal(true);
                              }}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            {salary.paymentStatus !== 'paid' && (
                              <button
                                onClick={() => handleMarkAsPaid(salary)}
                                className="text-green-400 hover:text-green-300"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Salary Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">
                {editingSalary ? 'Edit Payment' : 'Initiate Payment'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">User</label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={editingSalary}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} - {emp.profile?.designation || 'User'}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Base Amount</label>
                  <input
                    type="number"
                    value={formData.basicSalary}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({ ...formData, basicSalary: isNaN(val) ? 0 : val });
                    }}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bonus</label>
                  <input
                    type="number"
                    value={formData.bonus}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({ ...formData, bonus: isNaN(val) ? 0 : val });
                    }}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Allowances</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">House Rent</label>
                    <input
                      type="number"
                      value={formData.allowances.houseRent}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          allowances: { ...formData.allowances, houseRent: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Dearness</label>
                    <input
                      type="number"
                      value={formData.allowances.dearness}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          allowances: { ...formData.allowances, dearness: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Travel</label>
                    <input
                      type="number"
                      value={formData.allowances.travel}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          allowances: { ...formData.allowances, travel: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Medical</label>
                    <input
                      type="number"
                      value={formData.allowances.medical}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          allowances: { ...formData.allowances, medical: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Special</label>
                    <input
                      type="number"
                      value={formData.allowances.special}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          allowances: { ...formData.allowances, special: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Other</label>
                    <input
                      type="number"
                      value={formData.allowances.other}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          allowances: { ...formData.allowances, other: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Deductions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Tax</label>
                    <input
                      type="number"
                      value={formData.deductions.tax}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          deductions: { ...formData.deductions, tax: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Provident Fund</label>
                    <input
                      type="number"
                      value={formData.deductions.providentFund}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          deductions: { ...formData.deductions, providentFund: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Professional Tax</label>
                    <input
                      type="number"
                      value={formData.deductions.professionalTax}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          deductions: { ...formData.deductions, professionalTax: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Loan</label>
                    <input
                      type="number"
                      value={formData.deductions.loan}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          deductions: { ...formData.deductions, loan: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Other Deductions</label>
                    <input
                      type="number"
                      value={formData.deductions.other}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          deductions: { ...formData.deductions, other: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Overtime</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Hours</label>
                    <input
                      type="number"
                      value={formData.overtime.hours}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          overtime: { ...formData.overtime, hours: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Rate per Hour</label>
                    <input
                      type="number"
                      value={formData.overtime.rate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          overtime: { ...formData.overtime, rate: isNaN(val) ? 0 : val }
                        });
                      }}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-gray-600 rounded-xl p-4 space-y-3">
                <h4 className="text-lg font-semibold text-white">Salary payout bank (RazorpayX)</h4>
                <p className="text-xs text-gray-400">
                  For direct credit to employee bank, fill these or ensure the employee saved bank details in Profile. Required when using RAZORPAYX_ACCOUNT_NUMBER on the server.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Account holder name</label>
                    <input
                      type="text"
                      value={formData.payoutAccountName}
                      onChange={(e) => setFormData({ ...formData, payoutAccountName: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                      placeholder="As per bank"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Account number</label>
                    <input
                      type="text"
                      value={formData.payoutAccountNumber}
                      onChange={(e) => setFormData({ ...formData, payoutAccountNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                      placeholder="Bank account no."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">IFSC</label>
                    <input
                      type="text"
                      value={formData.payoutIfsc}
                      onChange={(e) => setFormData({ ...formData, payoutIfsc: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                      placeholder="e.g. HDFC0001234"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Net Salary:</span>
                  <span className="text-2xl font-bold text-blue-400">{formatCurrency(calculateNetSalary())}</span>
                </div>
                <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-200">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-gray-500"
                    checked={payNowWithRazorpay}
                    onChange={(e) => setPayNowWithRazorpay(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-white">Pay now with Razorpay</span>
                    <span className="block text-xs text-gray-400 mt-1">
                      After saving: sends salary to the employee&apos;s bank if RazorpayX is configured on the server;
                      otherwise opens Checkout for UPI, cards, or netbanking (money settles in your Razorpay balance).
                    </span>
                  </span>
                </label>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-100">Real money:</strong> use{' '}
                  <code className="text-amber-100 bg-black/30 px-1 rounded">rzp_live_…</code> keys in both{' '}
                  <code className="text-amber-100 bg-black/30 px-1 rounded">server/.env</code> and{' '}
                  <code className="text-amber-100 bg-black/30 px-1 rounded">client/.env</code> (VITE_RAZORPAY_KEY_ID).
                  Test keys (<code className="text-amber-100">rzp_test_</code>) always show demo UPI and no real debit.
                </p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  {loading
                    ? 'Working...'
                    : payNowWithRazorpay
                      ? editingSalary
                        ? 'Update & pay'
                        : 'Process salary & pay'
                      : editingSalary
                        ? 'Update salary'
                        : 'Save salary only'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-700 text-gray-300 py-3 rounded-xl hover:bg-gray-600 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;
