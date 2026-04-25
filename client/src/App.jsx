import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import HRDashboard from './pages/HRDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import './index.css';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <div className={darkMode ? 'dark' : ''}>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/hr/*"
                element={
                  <PrivateRoute allowedRoles={['hr']}>
                    <HRDashboard darkMode={darkMode} setDarkMode={setDarkMode} />
                  </PrivateRoute>
                }
              />
              <Route
                path="/employee/*"
                element={
                  <PrivateRoute allowedRoles={['employee']}>
                    <EmployeeDashboard darkMode={darkMode} setDarkMode={setDarkMode} />
                  </PrivateRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
          </div>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;