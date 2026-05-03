import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { DollarSign, Calendar, TrendingUp, Download, FileText, CheckCircle, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';

const MySalary = () => {
  const [salaries, setSalaries] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState(null);

  useEffect(() => {
    fetchMySalaries();
  }, [selectedYear]);

  const fetchMySalaries = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/salary/my-salary', {
        params: { year: selectedYear }
      });
      setSalaries(response.data);
    } catch (error) {
      console.error('Error fetching salary:', error);
      toast.error('Failed to fetch salary details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const getMonthName = (month) => {
    return new Date(2000, month, 1).toLocaleString('default', { month: 'long' });
  };

  const totalEarnings = salaries.reduce((sum, salary) => {
    const allowances = Object.values(salary.allowances || {}).reduce((a, b) => a + (b || 0), 0);
    return sum + (salary.basicSalary || 0) + allowances + (salary.bonus || 0);
  }, 0);

  const totalDeductions = salaries.reduce((sum, salary) => {
    const deductions = Object.values(salary.deductions || {}).reduce((a, b) => a + (b || 0), 0);
    return sum + deductions;
  }, 0);

  const totalNetSalary = salaries.reduce((sum, salary) => sum + (salary.netSalary || 0), 0);

  return (
    <div className="p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            My Payments
          </h2>
          <p className="text-gray-400 mt-2">View your payment details and transaction history</p>
        </div>

        {/* Year Filter */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 mb-6 border border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Select Year:</span>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
            >
              {[2023, 2024, 2025].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 border border-green-900/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-400 text-sm">Total Earnings (Yearly)</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totalEarnings)}</p>
              </div>
              <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 border border-red-900/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-400 text-sm">Total Deductions (Yearly)</p>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 border border-blue-900/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-400 text-sm">Net Amount Received</p>
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalNetSalary)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Salary History Table */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4">
            <h3 className="text-xl font-bold text-white">Payment History</h3>
            <p className="text-gray-400 text-sm mt-1">Monthly payment breakdown</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Base Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Additional Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Adjustments</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Bonus</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Final Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-400 mt-4">Loading salary records...</p>
                    </td>
                  </tr>
                ) : salaries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-gray-400">
                      <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      No salary records found for {selectedYear}
                    </td>
                  </tr>
                ) : (
                  salaries.map((salary) => {
                    const totalAllowances = Object.values(salary.allowances || {}).reduce((sum, val) => sum + (val || 0), 0);
                    const totalDeductions = Object.values(salary.deductions || {}).reduce((sum, val) => sum + (val || 0), 0);
                    
                    return (
                      <tr key={salary._id} className="hover:bg-gray-700/30 transition-colors duration-200">
                        <td className="px-6 py-4 font-medium text-white">{getMonthName(salary.month)} {salary.year}</td>
                        <td className="px-6 py-4 text-gray-300">{formatCurrency(salary.basicSalary)}</td>
                        <td className="px-6 py-4 text-green-400">{formatCurrency(totalAllowances)}</td>
                        <td className="px-6 py-4 text-red-400">{formatCurrency(totalDeductions)}</td>
                        <td className="px-6 py-4 text-yellow-400">{formatCurrency(salary.bonus)}</td>
                        <td className="px-6 py-4 text-blue-400 font-bold">{formatCurrency(salary.netSalary)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            salary.paymentStatus === 'paid' ? 'bg-green-900/50 text-green-400' :
                            salary.paymentStatus === 'processed' ? 'bg-yellow-900/50 text-yellow-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {salary.paymentStatus === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {salary.paymentStatus?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedSalary(salary)}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            View Details
                          </button>
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

      {/* Salary Details Modal */}
      {selectedSalary && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Payment Details</h3>
              <button onClick={() => setSelectedSalary(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="text-center border-b border-gray-700 pb-4">
                <h4 className="text-xl font-bold text-white">
                  Transaction for {getMonthName(selectedSalary.month)} {selectedSalary.year}
                </h4>
                <p className="text-gray-400 mt-1">Payment Status: {selectedSalary.paymentStatus?.toUpperCase() || 'PENDING'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <p className="text-gray-400 text-sm">Base Amount</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(selectedSalary.basicSalary)}</p>
                </div>
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <p className="text-gray-400 text-sm">Bonus</p>
                  <p className="text-xl font-bold text-yellow-400">{formatCurrency(selectedSalary.bonus)}</p>
                </div>
              </div>
              
              <div>
                <h5 className="text-lg font-semibold text-white mb-3">Additional Amount</h5>
                <div className="space-y-2">
                  {Object.entries(selectedSalary.allowances || {}).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-between items-center p-2 bg-gray-700/20 rounded-lg">
                        <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-green-400">{formatCurrency(value)}</span>
                      </div>
                    )
                  ))}
                  {Object.values(selectedSalary.allowances || {}).every(v => v === 0) && (
                    <p className="text-gray-500 text-center py-2">No allowances added</p>
                  )}
                </div>
              </div>
              
              <div>
                <h5 className="text-lg font-semibold text-white mb-3">Adjustments</h5>
                <div className="space-y-2">
                  {Object.entries(selectedSalary.deductions || {}).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-between items-center p-2 bg-gray-700/20 rounded-lg">
                        <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-red-400">{formatCurrency(value)}</span>
                      </div>
                    )
                  ))}
                  {Object.values(selectedSalary.deductions || {}).every(v => v === 0) && (
                    <p className="text-gray-500 text-center py-2">No deductions added</p>
                  )}
                </div>
              </div>
              
              {selectedSalary.overtime?.hours > 0 && (
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <p className="text-gray-400 text-sm">Overtime</p>
                  <p className="text-white">{selectedSalary.overtime.hours} hours @ {formatCurrency(selectedSalary.overtime.rate)}/hour</p>
                  <p className="text-blue-400 font-bold mt-1">{formatCurrency((selectedSalary.overtime.hours || 0) * (selectedSalary.overtime.rate || 0))}</p>
                </div>
              )}
              
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Final Amount:</span>
                  <span className="text-2xl font-bold text-blue-400">{formatCurrency(selectedSalary.netSalary)}</span>
                </div>
              </div>
              
              {selectedSalary.remarks && (
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <p className="text-gray-400 text-sm">Remarks</p>
                  <p className="text-white mt-1">{selectedSalary.remarks}</p>
                </div>
              )}
              
              {selectedSalary.paymentDate && (
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <p className="text-gray-400 text-sm">Payment Date</p>
                  <p className="text-white mt-1">{new Date(selectedSalary.paymentDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySalary;
