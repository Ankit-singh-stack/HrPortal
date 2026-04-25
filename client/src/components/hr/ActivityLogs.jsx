import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Download, Activity, User, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ action: '', userId: '' });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, [page, filter]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter.action) params.action = filter.action;
      if (filter.userId) params.userId = filter.userId;
      
      const response = await axios.get('/api/activities', { params });
      setLogs(response.data.logs || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilter({ ...filter, [key]: value });
    setPage(1);
  };

  const getActionBadge = (action) => {
    const colors = {
      USER_LOGIN: 'bg-green-900/50 text-green-400 border-green-700',
      USER_REGISTERED: 'bg-blue-900/50 text-blue-400 border-blue-700',
      USER_UPDATED: 'bg-purple-900/50 text-purple-400 border-purple-700',
      USER_DELETED: 'bg-red-900/50 text-red-400 border-red-700',
      ATTENDANCE_MARKED: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
      LEAVE_APPLIED: 'bg-indigo-900/50 text-indigo-400 border-indigo-700',
      LEAVE_APPROVED: 'bg-green-900/50 text-green-400 border-green-700',
      LEAVE_REJECTED: 'bg-red-900/50 text-red-400 border-red-700',
      SALARY_PROCESSED: 'bg-pink-900/50 text-pink-400 border-pink-700',
      SALARY_PAID: 'bg-emerald-900/50 text-emerald-400 border-emerald-700'
    };
    return colors[action] || 'bg-gray-700 text-gray-300 border-gray-600';
  };

  const getActionIcon = (action) => {
    if (action.includes('LOGIN')) return '🔐';
    if (action.includes('REGISTER')) return '📝';
    if (action.includes('UPDATE')) return '✏️';
    if (action.includes('DELETE')) return '🗑️';
    if (action.includes('ATTENDANCE')) return '📅';
    if (action.includes('LEAVE')) return '📋';
    if (action.includes('SALARY')) return '💰';
    return '📌';
  };

  const formatAction = (action) => {
    return action.split('_').join(' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return then.toLocaleDateString();
  };

  const exportToCSV = () => {
    if (logs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    
    const csv = logs.map(log => ({
      User: log.userId?.name || 'Unknown',
      Email: log.userId?.email || '',
      Action: formatAction(log.action),
      Details: JSON.stringify(log.details),
      Timestamp: new Date(log.createdAt).toLocaleString()
    }));
    
    const headers = Object.keys(csv[0]);
    const csvContent = "data:text/csv;charset=utf-8," + 
      headers.join(",") + "\n" +
      csv.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Logs exported successfully');
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Activity Logs
          </h2>
          <p className="text-gray-400 mt-2">Monitor all system activities and user actions</p>
        </div>
        
        {/* Filter Section */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl mb-6 p-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <Filter className="w-4 h-4 inline mr-1 text-blue-400" />
                Filter by Action
              </label>
              <select
                value={filter.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Actions</option>
                <option value="USER_LOGIN">User Login</option>
                <option value="USER_REGISTERED">User Registered</option>
                <option value="USER_UPDATED">User Updated</option>
                <option value="USER_DELETED">User Deleted</option>
                <option value="ATTENDANCE_MARKED">Attendance Marked</option>
                <option value="LEAVE_APPLIED">Leave Applied</option>
                <option value="LEAVE_APPROVED">Leave Approved</option>
                <option value="LEAVE_REJECTED">Leave Rejected</option>
                <option value="SALARY_PROCESSED">Salary Processed</option>
                <option value="SALARY_PAID">Salary Paid</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-1 text-blue-400" />
                Filter by User
              </label>
              <select
                value={filter.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-4 border border-blue-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Total Logs</p>
                <p className="text-2xl font-bold text-blue-400">{logs.length}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-4 border border-green-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">User Logins</p>
                <p className="text-2xl font-bold text-green-400">
                  {logs.filter(l => l.action === 'USER_LOGIN').length}
                </p>
              </div>
              <User className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-4 border border-purple-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Leave Actions</p>
                <p className="text-2xl font-bold text-purple-400">
                  {logs.filter(l => l.action.includes('LEAVE')).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-400 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-4 border border-yellow-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Today's Activity</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {logs.filter(l => {
                    const today = new Date().toDateString();
                    return new Date(l.createdAt).toDateString() === today;
                  }).length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-yellow-400 opacity-50" />
            </div>
          </div>
        </div>
        
        {/* Activity Logs Table */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-700 to-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-12">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      </div>
                      <p className="text-gray-400 mt-4">Loading logs...</p>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-12">
                      <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No activity logs found</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-700/50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {log.userId?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{log.userId?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">{log.userId?.email || ''}</p>
                            <p className="text-xs text-gray-500 mt-0.5 capitalize">{log.userId?.role || 'user'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border ${getActionBadge(log.action)}`}>
                          <span>{getActionIcon(log.action)}</span>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <details className="cursor-pointer">
                          <summary className="text-xs text-gray-400 hover:text-gray-300">View Details</summary>
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap max-w-md bg-gray-800/50 p-2 rounded-lg mt-2 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatTime(log.createdAt)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                          <div className="text-xs text-gray-600">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-700 flex justify-between items-center bg-gray-800/50">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-5 py-2 bg-gray-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-all duration-200 font-medium flex items-center gap-2"
              >
                <span>←</span>
                Previous
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-5 py-2 bg-gray-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-all duration-200 font-medium flex items-center gap-2"
              >
                Next
                <span>→</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Export Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={exportToCSV}
            disabled={logs.length === 0}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;