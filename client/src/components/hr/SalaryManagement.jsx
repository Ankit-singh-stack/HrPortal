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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const salaryData = {
        ...formData,
        month: selectedMonth,
        year: selectedYear
      };
      
      if (editingSalary) {
        await axios.put(`/api/salary/${editingSalary._id}`, salaryData);
        toast.success('Salary updated successfully');
      } else {
        await axios.post('/salary', salaryData);
        toast.success('Salary processed successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchSalaries();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (id) => {
    try {
      await axios.put(`/api/salary/${id}/pay`, { paymentMethod: 'bank' });
      toast.success('Salary marked as paid');
      fetchSalaries();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update payment status');
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
      remarks: ''
    });
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
              Salary Management
            </h2>
            <p className="text-gray-400 mt-2">Process employee salaries and manage payroll</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            Process Salary
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 border border-purple-900/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-400 text-sm">Total Payroll</p>
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
                <p className="text-gray-400 text-sm">Average Salary</p>
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
                <p className="text-gray-400 text-sm">Paid Salaries</p>
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
                <p className="text-gray-400 text-sm">Pending Salaries</p>
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
              <label className="block text-sm font-medium text-gray-400 mb-2">Month</label>
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
              <label className="block text-sm font-medium text-gray-400 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
              >
                {[2023, 2024, 2025].map(year => (
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
                Search
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Basic Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Allowances</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Deductions</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Net Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">Status</th>
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
                            <p className="text-xs text-gray-400">{salary.userId?.profile?.designation || 'Employee'}</p>
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
                            {salary.paymentStatus.toUpperCase()}
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
                                onClick={() => handleMarkAsPaid(salary._id)}
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
                {editingSalary ? 'Edit Salary' : 'Process Salary'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Employee</label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={editingSalary}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} - {emp.profile?.designation || 'Employee'}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Basic Salary</label>
                  <input
                    type="number"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bonus</label>
                  <input
                    type="number"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: parseFloat(e.target.value) })}
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
                      onChange={(e) => setFormData({
                        ...formData,
                        allowances: { ...formData.allowances, houseRent: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Dearness</label>
                    <input
                      type="number"
                      value={formData.allowances.dearness}
                      onChange={(e) => setFormData({
                        ...formData,
                        allowances: { ...formData.allowances, dearness: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Travel</label>
                    <input
                      type="number"
                      value={formData.allowances.travel}
                      onChange={(e) => setFormData({
                        ...formData,
                        allowances: { ...formData.allowances, travel: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Medical</label>
                    <input
                      type="number"
                      value={formData.allowances.medical}
                      onChange={(e) => setFormData({
                        ...formData,
                        allowances: { ...formData.allowances, medical: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Special</label>
                    <input
                      type="number"
                      value={formData.allowances.special}
                      onChange={(e) => setFormData({
                        ...formData,
                        allowances: { ...formData.allowances, special: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Other</label>
                    <input
                      type="number"
                      value={formData.allowances.other}
                      onChange={(e) => setFormData({
                        ...formData,
                        allowances: { ...formData.allowances, other: parseFloat(e.target.value) }
                      })}
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
                      onChange={(e) => setFormData({
                        ...formData,
                        deductions: { ...formData.deductions, tax: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Provident Fund</label>
                    <input
                      type="number"
                      value={formData.deductions.providentFund}
                      onChange={(e) => setFormData({
                        ...formData,
                        deductions: { ...formData.deductions, providentFund: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Professional Tax</label>
                    <input
                      type="number"
                      value={formData.deductions.professionalTax}
                      onChange={(e) => setFormData({
                        ...formData,
                        deductions: { ...formData.deductions, professionalTax: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Loan</label>
                    <input
                      type="number"
                      value={formData.deductions.loan}
                      onChange={(e) => setFormData({
                        ...formData,
                        deductions: { ...formData.deductions, loan: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Other Deductions</label>
                    <input
                      type="number"
                      value={formData.deductions.other}
                      onChange={(e) => setFormData({
                        ...formData,
                        deductions: { ...formData.deductions, other: parseFloat(e.target.value) }
                      })}
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
                      onChange={(e) => setFormData({
                        ...formData,
                        overtime: { ...formData.overtime, hours: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Rate per Hour</label>
                    <input
                      type="number"
                      value={formData.overtime.rate}
                      onChange={(e) => setFormData({
                        ...formData,
                        overtime: { ...formData.overtime, rate: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600"
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

              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Net Salary:</span>
                  <span className="text-2xl font-bold text-blue-400">{formatCurrency(calculateNetSalary())}</span>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  {loading ? 'Processing...' : (editingSalary ? 'Update Salary' : 'Process Salary')}
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
