import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { 
  User, 
  Calendar, 
  FileText, 
  LogOut,
  Clock,
  CheckCircle,
  Home,
  DollarSign,  // Add this import
  TrendingUp,
  Briefcase,
  Moon,
  Sun
} from 'lucide-react';
import Profile from '../components/employee/Profile';
import Attendance from '../components/employee/Attendance';
import LeaveApplication from '../components/employee/LeaveApplication';
import MySalary from '../components/employee/MySalary';  // Add this import

const EmployeeDashboard = ({ darkMode, setDarkMode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const [stats, setStats] = useState({
    attendanceRate: 0,
    pendingLeaves: 0,
    approvedLeaves: 0
  });

  useEffect(() => {
    fetchStats();
    
    if (socket) {
      socket.on('attendanceUpdate', () => fetchStats());
      socket.on('leaveUpdate', () => fetchStats());
      socket.on('salaryUpdate', (data) => {
        // Show notification for salary update
        console.log('Salary update received:', data);
      });
      
      return () => {
        socket.off('attendanceUpdate');
        socket.off('leaveUpdate');
        socket.off('salaryUpdate');
      };
    }
  }, [socket]);

  const fetchStats = async () => {
    try {
      const [attendanceRes, leavesRes] = await Promise.all([
        axios.get('/api/attendance'),
        axios.get('/api/leaves', { params: { userId: user?._id } })
      ]);
      
      const attendanceData = Array.isArray(attendanceRes.data) 
        ? attendanceRes.data 
        : attendanceRes.data.attendance || [];
      
      const totalDays = attendanceData.length;
      const presentDays = attendanceData.filter(a => a.status === 'present').length;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
      
      setStats({
        attendanceRate: Math.round(attendanceRate),
        pendingLeaves: leavesRes.data.leaves?.filter(l => l.status === 'pending').length || 0,
        approvedLeaves: leavesRes.data.leaves?.filter(l => l.status === 'approved').length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/employee', icon: Home, label: 'Dashboard', color: 'text-blue-600' },
    { path: '/employee/profile', icon: User, label: 'My Profile', color: 'text-green-600' },
    { path: '/employee/attendance', icon: Calendar, label: 'Attendance', color: 'text-purple-600' },
    { path: '/employee/leaves', icon: FileText, label: 'Leave Application', color: 'text-yellow-600' },
    { path: '/employee/salary', icon: DollarSign, label: 'My Salary', color: 'text-pink-600' },  // Add this line
  ];

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className="bg-gray-900 text-white w-72 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Employee Portal</h1>
              <p className="text-xs text-gray-400">Welcome, {user?.name}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
              <span className="inline-block px-2 py-0.5 bg-green-600 text-xs rounded-full mt-1">Employee</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 border-t border-gray-800 space-y-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center space-x-3 px-4 py-2 rounded-xl text-gray-300 hover:bg-gray-800 transition-all duration-200 w-full"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-2 rounded-xl text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200 w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <Routes>
          <Route path="/" element={
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  My Dashboard
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back, {user?.name}!</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Attendance Rate</p>
                      <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.attendanceRate}%</p>
                    </div>
                    <CheckCircle className="w-12 h-12 text-green-500 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Pending Leaves</p>
                      <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.pendingLeaves}</p>
                    </div>
                    <Clock className="w-12 h-12 text-yellow-500 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Approved Leaves</p>
                      <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.approvedLeaves}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-blue-500 opacity-50" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Attendance />
                <LeaveApplication />
              </div>
            </div>
          } />
          <Route path="/profile" element={<Profile />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leaves" element={<LeaveApplication />} />
          <Route path="/salary" element={<MySalary />} />  {/* Add this route */}
        </Routes>
      </div>
    </div>
  );
};

export default EmployeeDashboard;