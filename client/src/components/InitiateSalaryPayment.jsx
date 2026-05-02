import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Send, Check, X, AlertCircle } from 'lucide-react';

const InitiateSalaryPayment = ({ onSuccess }) => {
  const [salaries, setSalaries] = useState([]);
  const [selectedSalaries, setSelectedSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initiating, setInitiating] = useState(false);

  useEffect(() => {
    fetchProcessedSalaries();
  }, []);

  const fetchProcessedSalaries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/salary/all?status=processed');
      setSalaries(response.data.salaries || []);
    } catch (error) {
      toast.error('Failed to fetch salaries');
    } finally {
      setLoading(false);
    }
  };

  const toggleSalarySelection = (salaryId) => {
    setSelectedSalaries(prev =>
      prev.includes(salaryId)
        ? prev.filter(id => id !== salaryId)
        : [...prev, salaryId]
    );
  };

  const handleInitiatePayment = async () => {
    if (selectedSalaries.length === 0) {
      toast.error('Please select at least one salary');
      return;
    }

    try {
      setInitiating(true);
      const response = await api.post('/salary-payment/initiate', {
        salaryIds: selectedSalaries
      });

      const ok = response.data.results.filter((r) => r.success).length;
      if (response.data.payoutMode) {
        toast.success(`Bank transfer completed for ${ok} employee(s)`);
      } else {
        toast.success(`Razorpay checkout started for ${ok} employee(s) — complete payment in the portal`);
      }
      setSelectedSalaries([]);
      fetchProcessedSalaries();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setInitiating(false);
    }
  };

  const totalAmount = salaries
    .filter(s => selectedSalaries.includes(s._id))
    .reduce((sum, s) => sum + s.netSalary, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Send className="text-blue-600" size={24} />
        Initiate Salary Payments
      </h2>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading salaries...</p>
        </div>
      ) : salaries.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-600">No processed salaries found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSalaries(salaries.map(s => s._id));
                        } else {
                          setSelectedSalaries([]);
                        }
                      }}
                      checked={selectedSalaries.length === salaries.length && salaries.length > 0}
                    />
                  </th>
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Month/Year</th>
                  <th className="text-right p-2">Net Salary</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((salary) => (
                  <tr key={salary._id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedSalaries.includes(salary._id)}
                        onChange={() => toggleSalarySelection(salary._id)}
                      />
                    </td>
                    <td className="p-2">
                      <div>
                        <p className="font-medium">{salary.userId?.name}</p>
                        <p className="text-xs text-gray-500">{salary.userId?.email}</p>
                      </div>
                    </td>
                    <td className="p-2">{salary.month + 1}/{salary.year}</td>
                    <td className="p-2 text-right font-semibold">₹{isNaN(salary.netSalary) || !salary.netSalary ? '0' : salary.netSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        {salary.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedSalaries.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">
                Selected: <span className="font-semibold">{selectedSalaries.length}</span> salary records
              </p>
              <p className="text-lg font-bold text-blue-600 mt-2">
                Total Amount: ₹{isNaN(totalAmount) || !totalAmount ? '0' : totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>

              <button
                onClick={handleInitiatePayment}
                disabled={initiating}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <Send size={18} />
                {initiating ? 'Initiating...' : 'Initiate Payments'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InitiateSalaryPayment;
