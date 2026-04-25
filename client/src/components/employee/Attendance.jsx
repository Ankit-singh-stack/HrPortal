import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { Calendar, Clock, CheckCircle, XCircle, TrendingUp, Award, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const Attendance = () => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    total: 0
  });
  const [todayStatus, setTodayStatus] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttendanceHistory();
    fetchStats();
    checkTodayAttendance();
  }, [selectedMonth, selectedYear]);

  const fetchAttendanceHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/attendance', {
        params: {
          startDate: new Date(selectedYear, selectedMonth, 1).toISOString(),
          endDate: new Date(selectedYear, selectedMonth + 1, 0).toISOString()
        }
      });
      const attendanceData = Array.isArray(response.data) 
        ? response.data 
        : response.data.attendance || [];
      setAttendanceHistory(attendanceData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance history');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/attendance/stats', {
        params: { month: selectedMonth, year: selectedYear }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get('/api/attendance', {
        params: { startDate: today, endDate: today }
      });
      const attendanceData = Array.isArray(response.data) 
        ? response.data 
        : response.data.attendance || [];
      if (attendanceData.length > 0) {
        setTodayStatus(attendanceData[0]);
      } else {
        setTodayStatus(null);
      }
    } catch (error) {
      console.error('Error checking today attendance:', error);
    }
  };

  const handleMarkAttendance = async () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    try {
      await axios.post('/api/attendance', {
        status: 'present',
        checkInTime: currentTime
      });
      toast.success('Attendance marked successfully! 🎉');
      checkTodayAttendance();
      fetchAttendanceHistory();
      fetchStats();
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
  };

  const handleCheckOut = async () => {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    try {
      await axios.post('/api/attendance', {
        checkOutTime: currentTime
      });
      toast.success('Checked out successfully! 👋');
      checkTodayAttendance();
    } catch (error) {
      toast.error('Failed to check out');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const attendanceRate = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(0) : 0;

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Attendance Tracker
          </h2>
          <p className="text-gray-600 mt-2">Track your daily attendance and statistics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Attendance Card */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-6 lg:col-span-1 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Today's Status</h3>
              <Zap className="w-6 h-6 text-yellow-500" />
            </div>
            {todayStatus ? (
              <div>
                <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-xl">
                  <span className="text-gray-600 font-medium">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    todayStatus.status === 'present' ? 'bg-green-100 text-green-700 border border-green-200' : 
                    todayStatus.status === 'late' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                    'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {todayStatus.status?.toUpperCase() || 'PRESENT'}
                  </span>
                </div>
                {todayStatus.checkInTime && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-xl">
                    <span className="text-gray-600 font-medium">Check In:</span>
                    <span className="font-bold text-green-600">{todayStatus.checkInTime}</span>
                  </div>
                )}
                {todayStatus.checkOutTime ? (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <span className="text-gray-600 font-medium">Check Out:</span>
                    <span className="font-bold text-red-600">{todayStatus.checkOutTime}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleCheckOut}
                    className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
                  >
                    Check Out
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">Not marked yet</p>
                <button
                  onClick={handleMarkAttendance}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  Mark Attendance
                </button>
              </div>
            )}
          </div>
          
          {/* Stats Cards */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-lg p-5 border border-green-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Present</p>
                  <p className="text-3xl font-bold text-green-600">{stats.present || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="text-xs text-green-600 font-medium">{attendanceRate}% rate</div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl shadow-lg p-5 border border-red-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Absent</p>
                  <p className="text-3xl font-bold text-red-600">{stats.absent || 0}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg p-5 border border-yellow-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Late</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.late || 0}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg p-5 border border-blue-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Days</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.total || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Attendance History */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Attendance History</h3>
                <p className="text-blue-100 text-sm mt-1">Your monthly attendance records</p>
              </div>
              <div className="flex gap-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-4 py-2 bg-white/20 text-white rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i} className="text-gray-900">{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 bg-white/20 text-white rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {[2023, 2024, 2025].map(year => (
                    <option key={year} value={year} className="text-gray-900">{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading records...</p>
              </div>
            ) : attendanceHistory.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No attendance records found for this month</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendanceHistory.map((record, index) => (
                      <tr key={record._id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{formatDate(record.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.status?.toUpperCase() || 'PRESENT'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{record.checkInTime || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{record.checkOutTime || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;