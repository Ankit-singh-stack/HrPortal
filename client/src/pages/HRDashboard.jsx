import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from '../services/api';
import { 
  Users, 
  Calendar, 
  FileText, 
  Activity, 
  LogOut,
  Clock,
  CheckCircle,
  Home,
  TrendingUp,
  Briefcase,
  DollarSign,
  Menu,
  X,
  Bell,
  Sun,
  Moon
} from 'lucide-react';
import EmployeesList from '../components/hr/EmployeesList';
import AttendanceManagement from '../components/hr/AttendanceManagement';
import LeaveRequests from '../components/hr/LeaveRequests';
import ActivityLogs from '../components/hr/ActivityLogs';
import Analytics from '../components/hr/Analytics';
import SalaryManagement from '../components/hr/SalaryManagement';
import DocumentApproval from '../components/hr/DocumentApproval';
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

  useEffect(() => {
    fetchStats();
    
    if (socket) {
      socket.on('attendanceUpdate', () => fetchStats());
      socket.on('leaveUpdate', () => fetchStats());
      socket.on('userUpdate', () => fetchStats());
      
      return () => {
        socket.off('attendanceUpdate');
        socket.off('leaveUpdate');
        socket.off('userUpdate');
      };
    }
  }, [socket]);

  const fetchStats = async () => {
    try {
      const [employeesRes, attendanceRes, leavesRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/attendance'),
        axios.get('/leaves')
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/hr', icon: Home, label: 'Dashboard' },
    { path: '/hr/employees', icon: Users, label: 'Users' },
    { path: '/hr/attendance', icon: Calendar, label: 'Attendance' },
    { path: '/hr/leaves', icon: FileText, label: 'Leave Requests' },
    { path: '/hr/salary', icon: DollarSign, label: 'Payments' },
    { path: '/hr/activities', icon: Activity, label: 'Activity Logs' },
    { path: '/hr/documents', icon: FileText, label: 'Document Approvals' },
  ];

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile Drawer */}
      <div className={`fixed lg:static inset-y-0 left-0 bg-gray-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight">HR Management</h1>
                <p className="text-[10px] text-slate-400 font-medium">Internal Portal</p>
              </div>
            </div>
            <button
              className="lg:hidden text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-indigo-400">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate text-sm">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email?.split('@')[0]}</p>
              <span className="inline-block px-1.5 py-0.5 bg-blue-600 text-[10px] rounded-full mt-1">Admin</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="flex-1 truncate text-xs">{item.label}</span>
                {isActive && (
                  <div className="w-1 h-1 bg-white rounded-full animate-pulse flex-shrink-0"></div>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-3 border-t border-gray-800 space-y-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-200 w-full text-sm"
          >
            {darkMode ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate text-xs">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200 w-full text-sm"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="truncate text-xs">Logout</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0f172a]">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">HR Management</h2>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Routes>
            <Route path="/" element={
              <div className="p-3 sm:p-4 md:p-6">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                    Dashboard Overview
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Welcome back, {user?.name}!</p>
                </div>
                
                {/* Stats Cards - Responsive Grid */}
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 transition-all duration-300 hover:shadow-md group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Employees</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalEmployees}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center transition-colors group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 transition-all duration-300 hover:shadow-md group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Present Today</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.presentToday}</p>
                      </div>
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center transition-colors group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30">
                        <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 transition-all duration-300 hover:shadow-md group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Pending Leaves</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.pendingLeaves}</p>
                      </div>
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center transition-colors group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30">
                        <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 transition-all duration-300 hover:shadow-md group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Attendance Rate</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.attendanceRate}%</p>
                      </div>
                      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center transition-colors group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30">
                        <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Analytics Component - Made Responsive */}
                <div className="overflow-x-auto">
                  <Analytics />
                </div>
              </div>
            } />
            <Route path="/employees/*" element={<EmployeesList />} />
            <Route path="/attendance" element={<AttendanceManagement />} />
            <Route path="/leaves" element={<LeaveRequests />} />
            <Route path="/activities" element={<ActivityLogs />} />
            <Route path="/salary" element={<SalaryManagement />} />
            <Route path="/documents" element={<DocumentApproval />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
