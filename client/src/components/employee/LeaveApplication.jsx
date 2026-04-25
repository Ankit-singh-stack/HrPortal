import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { Calendar, FileText, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LeaveApplication = () => {
  const [formData, setFormData] = useState({
    type: 'casual',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaveHistory();
    fetchLeaveStats();
  }, []);

  const fetchLeaveHistory = async () => {
    try {
      const response = await axios.get('/leaves');
      setLeaveHistory(response.data.leaves || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  };

  const fetchLeaveStats = async () => {
    try {
      const response = await axios.get('/leaves/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fromDate || !formData.toDate) {
      toast.error('Please select dates');
      return;
    }
    
    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      toast.error('From date cannot be after to date');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post('/leaves', formData);
      toast.success('Leave application submitted successfully! 📝');
      setFormData({
        type: 'casual',
        fromDate: '',
        toDate: '',
        reason: ''
      });
      fetchLeaveHistory();
      fetchLeaveStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Leave Management
          </h2>
          <p className="text-gray-600 mt-2">Apply for leave and track your requests</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Application Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Apply for Leave</h3>
                <p className="text-blue-100 text-sm mt-1">Fill out the form below</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Leave Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="casual">🏖️ Casual Leave</option>
                    <option value="sick">🤒 Sick Leave</option>
                    <option value="annual">🌴 Annual Leave</option>
                    <option value="unpaid">💰 Unpaid Leave</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      name="fromDate"
                      value={formData.fromDate}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      name="toDate"
                      value={formData.toDate}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Please provide a detailed reason for your leave..."
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </div>
          </div>
          
          {/* Stats and History */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Leave Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                  <span className="text-gray-700 font-medium">Pending Requests:</span>
                  <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-gray-700 font-medium">Approved Requests:</span>
                  <span className="text-2xl font-bold text-green-600">{stats.approved}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-gray-700 font-medium">Rejected Requests:</span>
                  <span className="text-2xl font-bold text-red-600">{stats.rejected}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                  <span className="text-gray-800 font-semibold">Total Requests:</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.total}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Applications</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {leaveHistory.slice(0, 5).map((leave) => (
                  <div key={leave._id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-800 capitalize">{leave.type} leave</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(leave.status)}`}>
                            {getStatusIcon(leave.status)}
                            {leave.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {leave.rejectionReason && (
                      <p className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded-lg">{leave.rejectionReason}</p>
                    )}
                  </div>
                ))}
                {leaveHistory.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No leave applications yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveApplication;
