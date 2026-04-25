import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { 
  Users, 
  Calendar, 
  FileText, 
  Activity, 
  LogOut,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Home,
  UserPlus,
  Bell,
  Search,
  Moon,
  Sun,
  TrendingUp,
  Award,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Menu,
  X
} from 'lucide-react';
import EmployeesList from '../components/hr/EmployeesList';
import AttendanceManagement from '../components/hr/AttendanceManagement';
import LeaveRequests from '../components/hr/LeaveRequests';
import ActivityLogs from '../components/hr/ActivityLogs';
import Analytics from '../components/hr/Analytics';
import SalaryManagement from '../components/hr/SalaryManagement';
import toast from 'react-hot-toast';

const HRDashboard = ({ darkMode, setDarkMode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    pendingLeaves: 0,
    totalLeaveRequests: 0,
    attendanceRate: 0
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchStats();
    
    if (socket) {
      socket.on('attendanceUpdate', () => fetchStats());
      socket.on('leaveUpdate', (data) => {
        fetchStats();
        addNotification(`New leave request from ${data.leave?.userId?.name || 'an employee'}`);
      });
      socket.on('userUpdate', () => fetchStats());
      socket.on('salaryUpdate', (data) => {
        addNotification(data.message);
      });
      
      return () => {
        socket.off('attendanceUpdate');
        socket.off('leaveUpdate');
        socket.off('userUpdate');
        socket.off('salaryUpdate');
      };
    }
  }, [socket]);

  const fetchStats = async () => {
    try {
      const [employeesRes, attendanceRes, leavesRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/attendance'),
        axios.get('/api/leaves')
      ]);
      
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = attendanceRes.data.attendance?.filter(a => 
        new Date(a.date).toISOString().split('T')[0] === today
      ) || [];
      
      const totalEmployees = employeesRes.data.length;
      const presentToday = todayAttendance.filter(a => a.status === 'present').length;
      const absentToday = todayAttendance.filter(a => a.status === 'absent').length;
      const lateToday = todayAttendance.filter(a => a.status === 'late').length;
      const attendanceRate = totalEmployees > 0 ? ((presentToday + lateToday) / totalEmployees) * 100 : 0;
      
      setStats({
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
        pendingLeaves: leavesRes.data.leaves?.filter(l => l.status === 'pending').length || 0,
        totalLeaveRequests: leavesRes.data.leaves?.length || 0,
        attendanceRate: Math.round(attendanceRate)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const addNotification = (message) => {
    const newNotification = {
      id: Date.now(),
      message,
      time: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
    toast(message);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/hr', icon: Home, label: 'Dashboard', color: 'text-blue-600' },
    { path: '/hr/employees', icon: Users, label: 'Employees', color: 'text-green-600' },
    { path: '/hr/attendance', icon: Calendar, label: 'Attendance', color: 'text-purple-600' },
    { path: '/hr/leaves', icon: FileText, label: 'Leave Requests', color: 'text-yellow-600' },
    { path: '/hr/salary', icon: DollarSign, label: 'Salary Management', color: 'text-pink-600' },  // Add this line
    { path: '/hr/activities', icon: Activity, label: 'Activity Logs', color: 'text-red-600' },
  ];

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 bg-gray-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:translate-x-0'
      } md:w-64 lg:w-72`}>
        {/* Sidebar Header */}
        <div className="p-4 md:p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="hidden sm:block min-w-0">
                <h1 className="text-lg md:text-xl font-bold truncate">HR Portal</h1>
                <p className="text-xs text-gray-400 truncate">Management</p>
              </div>
            </div>
            <button
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* User Info */}
        <div className="p-4 md:p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate text-sm md:text-base">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              <span className="inline-block px-2 py-0.5 bg-blue-600 text-xs rounded-full mt-1">HR Admin</span>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all duration-200 text-sm md:text-base ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse flex-shrink-0"></div>
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* Sidebar Footer */}
        <div className="p-3 md:p-6 border-t border-gray-800 space-y-2 md:space-y-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center space-x-3 px-3 md:px-4 py-2 md:py-2 rounded-xl text-gray-300 hover:bg-gray-800 transition-all duration-200 w-full text-sm md:text-base"
          >
            {darkMode ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            <span className="truncate">{darkMode ? 'Light' : 'Dark'}</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 md:px-4 py-2 md:py-2 rounded-xl text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200 w-full text-sm md:text-base"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Logout</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black">
        {/* Top Header for Mobile */}
        <div className="md:hidden flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">HR Portal</h2>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={
              <div className="p-4 sm:p-6 md:p-8">
                <div className="mb-6 md:mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Dashboard Overview
                  </h2>
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">Welcome back, {user?.name}!</p>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Total Employees</p>
                        <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{stats.totalEmployees}</p>
                      </div>
                      <Users className="w-10 h-10 md:w-12 md:h-12 text-blue-500 opacity-50 flex-shrink-0" />
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Present Today</p>
                        <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{stats.presentToday}</p>
                      </div>
                      <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-green-500 opacity-50 flex-shrink-0" />
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Pending Leaves</p>
                        <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{stats.pendingLeaves}</p>
                      </div>
                      <Clock className="w-10 h-10 md:w-12 md:h-12 text-yellow-500 opacity-50 flex-shrink-0" />
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Attendance Rate</p>
                        <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{stats.attendanceRate}%</p>
                      </div>
                      <TrendingUp className="w-10 h-10 md:w-12 md:h-12 text-purple-500 opacity-50 flex-shrink-0" />
                    </div>
                  </div>
                </div>
                
                <Analytics />
              </div>
            } />
            <Route path="/employees/*" element={<EmployeesList />} />
            <Route path="/attendance" element={<AttendanceManagement />} />
            <Route path="/leaves" element={<LeaveRequests />} />
            <Route path="/activities" element={<ActivityLogs />} />
            <Route path="/salary" element={<SalaryManagement />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;