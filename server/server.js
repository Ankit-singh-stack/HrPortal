import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const app = express();

// Fix for __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== CORS CONFIGURATION (FIXED FOR PRODUCTION) ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://hrportal-client.onrender.com',
  'https://hr-portal-server.onrender.com',
  process.env.CLIENT_URL,
  process.env.RENDER_EXTERNAL_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Allow in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, true); // Allow in development, change in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== IN-MEMORY DATABASE ==========
const users = [];
const attendance = [];
const leaves = [];
const activityLogs = [];
const salaries = [];
let nextId = 1;

// Create default HR user on startup
const createDefaultHR = async () => {
  const existingHR = users.find(u => u.role === 'hr');
  if (!existingHR) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    users.push({
      _id: (nextId++).toString(),
      name: 'HR Admin',
      email: 'hr@admin.com',
      password: hashedPassword,
      role: 'hr',
      profile: {
        phone: '9999999999',
        designation: 'HR Manager',
        department: 'Human Resources',
        address: 'Corporate Office',
        joinDate: new Date().toISOString().split('T')[0]
      },
      isActive: true,
      createdAt: new Date()
    });
    console.log('✅ Default HR user created: hr@admin.com / 123456');
  }
};

// Helper functions
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });
};

const calculateNetSalary = (basicSalary, allowances, deductions, bonus, overtime) => {
  const totalAllowances = Object.values(allowances || {}).reduce((sum, val) => sum + (val || 0), 0);
  const totalDeductions = Object.values(deductions || {}).reduce((sum, val) => sum + (val || 0), 0);
  const overtimeAmount = (overtime?.hours || 0) * (overtime?.rate || 0);
  return (basicSalary || 0) + totalAllowances + (bonus || 0) + overtimeAmount - totalDeductions;
};

// ========== AUTH MIDDLEWARE ==========
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    const user = users.find(u => u._id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

const hrMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'hr') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. HR only.' });
  }
};

// ========== API ROUTES ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', status: 'ok', timestamp: new Date() });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      _id: (nextId++).toString(),
      name,
      email,
      password: hashedPassword,
      role: role || 'employee',
      profile: {
        phone: '',
        designation: '',
        department: '',
        address: '',
        joinDate: new Date().toISOString().split('T')[0]
      },
      isActive: true,
      createdAt: new Date()
    };
    
    users.push(user);
    
    activityLogs.push({
      _id: (nextId++).toString(),
      userId: user._id,
      action: 'USER_REGISTERED',
      details: { email: user.email },
      createdAt: new Date()
    });
    
    const token = generateToken(user._id);
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({ ...userWithoutPassword, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated.' });
    }
    
    activityLogs.push({
      _id: (nextId++).toString(),
      userId: user._id,
      action: 'USER_LOGIN',
      details: { email: user.email },
      createdAt: new Date()
    });
    
    const token = generateToken(user._id);
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ ...userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/create-hr', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      _id: (nextId++).toString(),
      name,
      email,
      password: hashedPassword,
      role: 'hr',
      profile: {
        phone: '',
        designation: 'HR Manager',
        department: 'Human Resources',
        address: '',
        joinDate: new Date().toISOString().split('T')[0]
      },
      isActive: true,
      createdAt: new Date()
    };
    
    users.push(user);
    
    const token = generateToken(user._id);
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({ ...userWithoutPassword, token });
  } catch (error) {
    console.error('Create HR error:', error);
    res.status(500).json({ message: error.message });
  }
});

// User Routes
app.get('/api/users', authMiddleware, hrMiddleware, (req, res) => {
  const usersWithoutPassword = users.map(({ password, ...user }) => user);
  res.json(usersWithoutPassword);
});

app.get('/api/users/profile', authMiddleware, (req, res) => {
  const { password, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

app.get('/api/users/:id', authMiddleware, (req, res) => {
  const user = users.find(u => u._id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.put('/api/users/:id', authMiddleware, async (req, res) => {
  const user = users.find(u => u._id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  if (req.body.name) user.name = req.body.name;
  if (req.body.profile) user.profile = { ...user.profile, ...req.body.profile };
  if (req.body.role && req.user.role === 'hr') user.role = req.body.role;
  
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.delete('/api/users/:id', authMiddleware, hrMiddleware, (req, res) => {
  const index = users.findIndex(u => u._id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'User not found' });
  }
  users.splice(index, 1);
  res.json({ message: 'User deleted successfully' });
});

// Attendance Routes
app.post('/api/attendance', authMiddleware, (req, res) => {
  const { status, checkInTime, checkOutTime } = req.body;
  const userId = req.user._id;
  const today = new Date().toISOString().split('T')[0];
  
  const existingAttendance = attendance.find(a => a.userId === userId && a.date === today);
  
  if (existingAttendance) {
    existingAttendance.status = status || existingAttendance.status;
    existingAttendance.checkInTime = checkInTime || existingAttendance.checkInTime;
    existingAttendance.checkOutTime = checkOutTime || existingAttendance.checkOutTime;
    res.json(existingAttendance);
  } else {
    const newAttendance = {
      _id: (nextId++).toString(),
      userId,
      date: today,
      status: status || 'present',
      checkInTime: checkInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      checkOutTime: checkOutTime || null,
      createdAt: new Date()
    };
    attendance.push(newAttendance);
    res.json(newAttendance);
  }
});

app.get('/api/attendance', authMiddleware, (req, res) => {
  const { userId, startDate, endDate } = req.query;
  let filteredAttendance = [...attendance];
  
  if (userId) {
    filteredAttendance = filteredAttendance.filter(a => a.userId === userId);
  } else if (req.user.role === 'employee') {
    filteredAttendance = filteredAttendance.filter(a => a.userId === req.user._id);
  }
  
  const result = filteredAttendance.map(record => ({
    ...record,
    userId: users.find(u => u._id === record.userId) || record.userId
  }));
  
  res.json({ attendance: result, total: result.length });
});

app.get('/api/attendance/stats', authMiddleware, (req, res) => {
  const { userId, month, year } = req.query;
  const targetUserId = userId || (req.user.role === 'employee' ? req.user._id : null);
  
  if (!targetUserId) {
    return res.json({ present: 0, absent: 0, late: 0, halfDay: 0, total: 0 });
  }
  
  const userAttendance = attendance.filter(a => a.userId === targetUserId);
  const stats = {
    present: userAttendance.filter(a => a.status === 'present').length,
    absent: userAttendance.filter(a => a.status === 'absent').length,
    late: userAttendance.filter(a => a.status === 'late').length,
    halfDay: userAttendance.filter(a => a.status === 'half-day').length,
    total: userAttendance.length
  };
  res.json(stats);
});

// Leave Routes
app.post('/api/leaves', authMiddleware, (req, res) => {
  const { type, fromDate, toDate, reason } = req.body;
  
  const overlapping = leaves.find(l => 
    l.userId === req.user._id && l.status === 'pending' &&
    new Date(l.fromDate) <= new Date(toDate) && new Date(l.toDate) >= new Date(fromDate)
  );
  
  if (overlapping) {
    return res.status(400).json({ message: 'You already have a pending leave request for this period' });
  }
  
  const leave = {
    _id: (nextId++).toString(),
    userId: req.user._id,
    type,
    fromDate: new Date(fromDate).toISOString(),
    toDate: new Date(toDate).toISOString(),
    reason,
    status: 'pending',
    createdAt: new Date()
  };
  
  leaves.push(leave);
  res.status(201).json(leave);
});

app.get('/api/leaves', authMiddleware, (req, res) => {
  const { userId, status } = req.query;
  let filteredLeaves = [...leaves];
  
  if (userId) {
    filteredLeaves = filteredLeaves.filter(l => l.userId === userId);
  } else if (req.user.role === 'employee') {
    filteredLeaves = filteredLeaves.filter(l => l.userId === req.user._id);
  }
  
  if (status) filteredLeaves = filteredLeaves.filter(l => l.status === status);
  
  const result = filteredLeaves.map(record => ({
    ...record,
    userId: users.find(u => u._id === record.userId) || record.userId
  }));
  
  res.json({ leaves: result, total: result.length });
});

app.get('/api/leaves/stats', authMiddleware, (req, res) => {
  const { userId } = req.query;
  const targetUserId = userId || (req.user.role === 'employee' ? req.user._id : null);
  
  if (!targetUserId) {
    return res.json({ pending: 0, approved: 0, rejected: 0, total: 0 });
  }
  
  const userLeaves = leaves.filter(l => l.userId === targetUserId);
  const stats = {
    pending: userLeaves.filter(l => l.status === 'pending').length,
    approved: userLeaves.filter(l => l.status === 'approved').length,
    rejected: userLeaves.filter(l => l.status === 'rejected').length,
    total: userLeaves.length
  };
  res.json(stats);
});

app.put('/api/leaves/:id', authMiddleware, hrMiddleware, (req, res) => {
  const { status, rejectionReason } = req.body;
  const leave = leaves.find(l => l._id === req.params.id);
  if (!leave) return res.status(404).json({ message: 'Leave request not found' });
  
  leave.status = status;
  if (status === 'rejected') leave.rejectionReason = rejectionReason;
  leave.reviewedBy = req.user._id;
  res.json(leave);
});

// Activity Routes
app.get('/api/activities', authMiddleware, hrMiddleware, (req, res) => {
  const { userId, action } = req.query;
  let filteredLogs = [...activityLogs];
  
  if (userId) filteredLogs = filteredLogs.filter(l => l.userId === userId);
  if (action) filteredLogs = filteredLogs.filter(l => l.action === action);
  
  const result = filteredLogs.map(log => ({
    ...log,
    userId: users.find(u => u._id === log.userId) || log.userId
  }));
  
  res.json({ logs: result, total: result.length });
});

// Salary Routes
app.post('/api/salary', authMiddleware, hrMiddleware, (req, res) => {
  const { userId, month, year, basicSalary, allowances, deductions, bonus } = req.body;
  
  const existingSalary = salaries.find(s => s.userId === userId && s.month === month && s.year === year);
  if (existingSalary) {
    return res.status(400).json({ message: 'Salary already processed for this month' });
  }
  
  const netSalary = calculateNetSalary(basicSalary, allowances, deductions, bonus, { hours: 0, rate: 0 });
  
  const salary = {
    _id: (nextId++).toString(),
    userId, month, year, basicSalary,
    allowances: allowances || {},
    deductions: deductions || {},
    bonus: bonus || 0,
    netSalary,
    paymentStatus: 'processed',
    createdAt: new Date()
  };
  
  salaries.push(salary);
  res.status(201).json(salary);
});

app.get('/api/salary/all', authMiddleware, hrMiddleware, (req, res) => {
  const { month, year } = req.query;
  let filteredSalaries = [...salaries];
  
  if (month !== undefined && year) {
    filteredSalaries = filteredSalaries.filter(s => s.month === parseInt(month) && s.year === parseInt(year));
  }
  
  const result = filteredSalaries.map(salary => ({
    ...salary,
    userId: users.find(u => u._id === salary.userId) || salary.userId
  }));
  
  res.json({ salaries: result, total: result.length });
});

app.get('/api/salary/my-salary', authMiddleware, (req, res) => {
  const filteredSalaries = salaries.filter(s => s.userId === req.user._id);
  res.json(filteredSalaries);
});

app.get('/api/salary/stats', authMiddleware, hrMiddleware, (req, res) => {
  const totalPayroll = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
  const paidCount = salaries.filter(s => s.paymentStatus === 'paid').length;
  const pendingCount = salaries.filter(s => s.paymentStatus === 'processed').length;
  
  res.json({
    summary: {
      totalPayroll,
      averageSalary: salaries.length > 0 ? totalPayroll / salaries.length : 0,
      totalEmployees: salaries.length,
      paidCount,
      pendingCount
    }
  });
});

// ========== CREATE DEFAULT HR ON STARTUP ==========
await createDefaultHR();

// ========== SERVE FRONTEND ==========
const distPath = path.join(__dirname, '../client/dist');

if (fs.existsSync(distPath)) {
  // Serve static files from dist
  app.use(express.static(distPath));
  
  // For any request that doesn't start with /api, send index.html
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('✅ Serving frontend from:', distPath);
} else {
  console.log('⚠️ Frontend build not found. Run "cd client && npm run build" first');
  console.log('📍 Only API endpoints available at http://localhost:5000/api/health');
}

// ========== ERROR HANDLING MIDDLEWARE ==========
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server is running!`);
  console.log(`📍 API: http://localhost:${PORT}/api/health`);
  // console.log(`📍 Frontend: http://localhost:${PORT}`);
  console.log(`📍 Default HR Login: hr@admin.com / 123456`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 CORS Enabled for production\n`);
});