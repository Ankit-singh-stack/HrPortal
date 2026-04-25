import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

// ✅ Fix for __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CORS (important for deployment)
app.use(cors({
  origin: "*", // you can restrict later
  credentials: true
}));

app.use(express.json());

/* ================= YOUR EXISTING CODE (UNCHANGED) ================= */
// 👉 I am not touching your routes logic — it's already correct

// In-memory database
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

// Calculate net salary helper
const calculateNetSalary = (basicSalary, allowances, deductions, bonus, overtime) => {
  const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0);
  const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + (val || 0), 0);
  const overtimeAmount = (overtime?.hours || 0) * (overtime?.rate || 0);
  
  return basicSalary + totalAllowances + (bonus || 0) + overtimeAmount - totalDeductions;
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

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', status: 'ok', timestamp: new Date() });
});

// ========== AUTH ROUTES ==========
// Register
app.post('/api/auth/register', async (req, res) => {
  console.log('📝 Registration request:', req.body.email);
  
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
    
    console.log('✅ User registered:', email);
    
    res.status(201).json({
      ...userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 Login request:', req.body.email);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    const user = users.find(u => u.email === email);
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
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
    
    console.log('✅ User logged in:', email, 'Role:', user.role);
    
    res.json({
      ...userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Create HR user (helper endpoint)
app.post('/api/auth/create-hr', async (req, res) => {
  console.log('👑 Creating HR user...');
  
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
    
    console.log('✅ HR user created:', email);
    
    res.status(201).json({
      ...userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('❌ Error creating HR:', error);
    res.status(500).json({ message: error.message });
  }
});

// ========== USER ROUTES ==========
// Get all users (HR only)
app.get('/api/users', authMiddleware, hrMiddleware, (req, res) => {
  try {
    const usersWithoutPassword = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user profile
app.get('/api/users/profile', authMiddleware, (req, res) => {
  try {
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID
app.get('/api/users/:id', authMiddleware, (req, res) => {
  try {
    const user = users.find(u => u._id === req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user
app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const user = users.find(u => u._id === req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (req.body.name) user.name = req.body.name;
    if (req.body.profile) user.profile = { ...user.profile, ...req.body.profile };
    
    if (req.body.role && req.user.role === 'hr') {
      user.role = req.body.role;
    }
    
    activityLogs.push({
      _id: (nextId++).toString(),
      userId: req.user._id,
      action: 'USER_UPDATED',
      details: { targetUser: user.email },
      createdAt: new Date()
    });
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user (HR only)
app.delete('/api/users/:id', authMiddleware, hrMiddleware, (req, res) => {
  try {
    const index = users.findIndex(u => u._id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const deletedUser = users[index];
    users.splice(index, 1);
    
    activityLogs.push({
      _id: (nextId++).toString(),
      userId: req.user._id,
      action: 'USER_DELETED',
      details: { deletedUser: deletedUser.email },
      createdAt: new Date()
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== ATTENDANCE ROUTES ==========
// Mark attendance
app.post('/api/attendance', authMiddleware, (req, res) => {
  try {
    const { status, checkInTime, checkOutTime, notes } = req.body;
    const userId = req.user._id;
    
    const today = new Date().toISOString().split('T')[0];
    
    const existingAttendance = attendance.find(a => 
      a.userId === userId && a.date === today
    );
    
    if (existingAttendance) {
      existingAttendance.status = status || existingAttendance.status;
      existingAttendance.checkInTime = checkInTime || existingAttendance.checkInTime;
      existingAttendance.checkOutTime = checkOutTime || existingAttendance.checkOutTime;
      existingAttendance.notes = notes || existingAttendance.notes;
      existingAttendance.updatedAt = new Date();
      
      res.json(existingAttendance);
    } else {
      const newAttendance = {
        _id: (nextId++).toString(),
        userId,
        date: today,
        status: status || 'present',
        checkInTime: checkInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        checkOutTime: checkOutTime || null,
        notes: notes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      attendance.push(newAttendance);
      
      activityLogs.push({
        _id: (nextId++).toString(),
        userId: req.user._id,
        action: 'ATTENDANCE_MARKED',
        details: { date: today, status: newAttendance.status },
        createdAt: new Date()
      });
      
      res.json(newAttendance);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance records
app.get('/api/attendance', authMiddleware, (req, res) => {
  try {
    const { userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    let filteredAttendance = [...attendance];
    
    if (userId) {
      filteredAttendance = filteredAttendance.filter(a => a.userId === userId);
    } else if (req.user.role === 'employee') {
      filteredAttendance = filteredAttendance.filter(a => a.userId === req.user._id);
    }
    
    if (startDate) {
      const start = new Date(startDate).toISOString().split('T')[0];
      filteredAttendance = filteredAttendance.filter(a => a.date >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate).toISOString().split('T')[0];
      filteredAttendance = filteredAttendance.filter(a => a.date <= end);
    }
    
    filteredAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = filteredAttendance.slice(start, start + parseInt(limit));
    
    const result = paginated.map(record => ({
      ...record,
      userId: users.find(u => u._id === record.userId) || record.userId
    }));
    
    res.json({
      attendance: result,
      total: filteredAttendance.length,
      page: parseInt(page),
      pages: Math.ceil(filteredAttendance.length / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance stats
app.get('/api/attendance/stats', authMiddleware, (req, res) => {
  try {
    const { userId, month, year } = req.query;
    const targetUserId = userId || (req.user.role === 'employee' ? req.user._id : null);
    
    if (!targetUserId) {
      return res.json({ present: 0, absent: 0, late: 0, halfDay: 0, total: 0 });
    }
    
    const userAttendance = attendance.filter(a => a.userId === targetUserId);
    
    let filtered = userAttendance;
    if (month !== undefined && year) {
      filtered = userAttendance.filter(a => {
        const date = new Date(a.date);
        return date.getMonth() === parseInt(month) && date.getFullYear() === parseInt(year);
      });
    }
    
    const stats = {
      present: filtered.filter(a => a.status === 'present').length,
      absent: filtered.filter(a => a.status === 'absent').length,
      late: filtered.filter(a => a.status === 'late').length,
      halfDay: filtered.filter(a => a.status === 'half-day').length,
      total: filtered.length
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== LEAVE ROUTES ==========
// Apply for leave
app.post('/api/leaves', authMiddleware, (req, res) => {
  try {
    const { type, fromDate, toDate, reason } = req.body;
    
    const overlapping = leaves.find(l => 
      l.userId === req.user._id && 
      l.status === 'pending' &&
      new Date(l.fromDate) <= new Date(toDate) && 
      new Date(l.toDate) >= new Date(fromDate)
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
      rejectionReason: null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    leaves.push(leave);
    
    activityLogs.push({
      _id: (nextId++).toString(),
      userId: req.user._id,
      action: 'LEAVE_APPLIED',
      details: { type, fromDate, toDate },
      createdAt: new Date()
    });
    
    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get leaves
app.get('/api/leaves', authMiddleware, (req, res) => {
  try {
    const { userId, status, page = 1, limit = 50 } = req.query;
    let filteredLeaves = [...leaves];
    
    if (userId) {
      filteredLeaves = filteredLeaves.filter(l => l.userId === userId);
    } else if (req.user.role === 'employee') {
      filteredLeaves = filteredLeaves.filter(l => l.userId === req.user._id);
    }
    
    if (status) {
      filteredLeaves = filteredLeaves.filter(l => l.status === status);
    }
    
    filteredLeaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = filteredLeaves.slice(start, start + parseInt(limit));
    
    const result = paginated.map(record => ({
      ...record,
      userId: users.find(u => u._id === record.userId) || record.userId,
      reviewedBy: record.reviewedBy ? users.find(u => u._id === record.reviewedBy) : null
    }));
    
    res.json({
      leaves: result,
      total: filteredLeaves.length,
      page: parseInt(page),
      pages: Math.ceil(filteredLeaves.length / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get leave stats
app.get('/api/leaves/stats', authMiddleware, (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update leave status (HR only)
app.put('/api/leaves/:id', authMiddleware, hrMiddleware, (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const leave = leaves.find(l => l._id === req.params.id);
    
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    leave.status = status;
    if (status === 'rejected') leave.rejectionReason = rejectionReason;
    leave.reviewedBy = req.user._id;
    leave.updatedAt = new Date();
    
    activityLogs.push({
      _id: (nextId++).toString(),
      userId: req.user._id,
      action: `LEAVE_${status.toUpperCase()}`,
      details: { leaveId: leave._id, userId: leave.userId },
      createdAt: new Date()
    });
    
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== ACTIVITY LOGS ROUTES ==========
// Get activity logs (HR only)
app.get('/api/activities', authMiddleware, hrMiddleware, (req, res) => {
  try {
    const { userId, action, page = 1, limit = 50 } = req.query;
    let filteredLogs = [...activityLogs];
    
    if (userId) {
      filteredLogs = filteredLogs.filter(l => l.userId === userId);
    }
    
    if (action) {
      filteredLogs = filteredLogs.filter(l => l.action === action);
    }
    
    filteredLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = filteredLogs.slice(start, start + parseInt(limit));
    
    const result = paginated.map(log => ({
      ...log,
      userId: users.find(u => u._id === log.userId) || log.userId
    }));
    
    res.json({
      logs: result,
      total: filteredLogs.length,
      page: parseInt(page),
      pages: Math.ceil(filteredLogs.length / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== SALARY ROUTES ==========
// Process salary (HR only)
app.post('/api/salary', authMiddleware, hrMiddleware, (req, res) => {
  try {
    const { 
      userId, month, year, basicSalary, allowances, deductions, 
      bonus, overtime, paymentMethod, bankAccount, remarks 
    } = req.body;
    
    const existingSalary = salaries.find(s => s.userId === userId && s.month === month && s.year === year);
    if (existingSalary) {
      return res.status(400).json({ message: 'Salary already processed for this month' });
    }
    
    const netSalary = calculateNetSalary(basicSalary, allowances, deductions, bonus, overtime);
    
    const salary = {
      _id: (nextId++).toString(),
      userId,
      month,
      year,
      basicSalary,
      allowances: allowances || { houseRent: 0, dearness: 0, travel: 0, medical: 0, special: 0, other: 0 },
      deductions: deductions || { tax: 0, providentFund: 0, professionalTax: 0, loan: 0, other: 0 },
      bonus: bonus || 0,
      overtime: overtime || { hours: 0, rate: 0, amount: 0 },
      netSalary,
      paymentMethod: paymentMethod || 'bank',
      bankAccount: bankAccount || '',
      remarks: remarks || '',
      paymentStatus: 'processed',
      processedBy: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    salaries.push(salary);
    
    activityLogs.push({
      _id: (nextId++).toString(),
      userId: req.user._id,
      action: 'SALARY_PROCESSED',
      details: { userId, month, year, netSalary },
      createdAt: new Date()
    });
    
    res.status(201).json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update salary (HR only)
app.put('/api/salary/:id', authMiddleware, hrMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { basicSalary, allowances, deductions, bonus, overtime, paymentStatus, remarks } = req.body;
    
    const salary = salaries.find(s => s._id === id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }
    
    if (basicSalary) salary.basicSalary = basicSalary;
    if (allowances) salary.allowances = { ...salary.allowances, ...allowances };
    if (deductions) salary.deductions = { ...salary.deductions, ...deductions };
    if (bonus !== undefined) salary.bonus = bonus;
    if (overtime) salary.overtime = { ...salary.overtime, ...overtime };
    if (paymentStatus) salary.paymentStatus = paymentStatus;
    if (remarks) salary.remarks = remarks;
    
    salary.netSalary = calculateNetSalary(
      salary.basicSalary, 
      salary.allowances, 
      salary.deductions, 
      salary.bonus, 
      salary.overtime
    );
    salary.updatedAt = new Date();
    
    activityLogs.push({
      _id: (nextId++).toString(),
      userId: req.user._id,
      action: 'SALARY_UPDATED',
      details: { salaryId: id, userId: salary.userId },
      createdAt: new Date()
    });
    
    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all salaries (HR only)
app.get('/api/salary/all', authMiddleware, hrMiddleware, (req, res) => {
  try {
    const { month, year, userId, page = 1, limit = 50 } = req.query;
    let filteredSalaries = [...salaries];
    
    if (month !== undefined && year) {
      filteredSalaries = filteredSalaries.filter(s => s.month === parseInt(month) && s.year === parseInt(year));
    }
    if (userId) {
      filteredSalaries = filteredSalaries.filter(s => s.userId === userId);
    }
    
    filteredSalaries.sort((a, b) => b.year - a.year || b.month - a.month);
    
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = filteredSalaries.slice(start, start + parseInt(limit));
    
    const result = paginated.map(salary => ({
      ...salary,
      userId: users.find(u => u._id === salary.userId) || salary.userId,
      processedBy: users.find(u => u._id === salary.processedBy) || salary.processedBy
    }));
    
    res.json({
      salaries: result,
      total: filteredSalaries.length,
      page: parseInt(page),
      pages: Math.ceil(filteredSalaries.length / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employee salary (Employee view)
app.get('/api/salary/my-salary', authMiddleware, (req, res) => {
  try {
    const { year } = req.query;
    let filteredSalaries = salaries.filter(s => s.userId === req.user._id);
    
    if (year) {
      filteredSalaries = filteredSalaries.filter(s => s.year === parseInt(year));
    }
    
    filteredSalaries.sort((a, b) => b.year - a.year || b.month - a.month);
    
    const result = filteredSalaries.map(salary => ({
      ...salary,
      processedBy: users.find(u => u._id === salary.processedBy) || salary.processedBy
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get salary by ID
app.get('/api/salary/:id', authMiddleware, (req, res) => {
  try {
    const salary = salaries.find(s => s._id === req.params.id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }
    
    if (req.user.role !== 'hr' && salary.userId !== req.user._id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const result = {
      ...salary,
      userId: users.find(u => u._id === salary.userId) || salary.userId,
      processedBy: users.find(u => u._id === salary.processedBy) || salary.processedBy
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark salary as paid (HR only)
app.put('/api/salary/:id/pay', authMiddleware, hrMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;
    
    const salary = salaries.find(s => s._id === id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }
    
    salary.paymentStatus = 'paid';
    salary.paymentDate = new Date();
    if (paymentMethod) salary.paymentMethod = paymentMethod;
    if (transactionId) salary.bankAccount = transactionId;
    salary.updatedAt = new Date();
    
    activityLogs.push({
      _id: (nextId++).toString(),
      userId: req.user._id,
      action: 'SALARY_PAID',
      details: { salaryId: id, userId: salary.userId },
      createdAt: new Date()
    });
    
    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get salary statistics (HR only)
app.get('/api/salary/stats', authMiddleware, hrMiddleware, (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    const yearlySalaries = salaries.filter(s => s.year === targetYear);
    
    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const monthSalaries = yearlySalaries.filter(s => s.month === i);
      const totalSalary = monthSalaries.reduce((sum, s) => sum + s.netSalary, 0);
      const avgSalary = monthSalaries.length > 0 ? totalSalary / monthSalaries.length : 0;
      
      return {
        _id: i,
        totalSalary,
        averageSalary: avgSalary,
        count: monthSalaries.length
      };
    });
    
    const totalPayroll = yearlySalaries.reduce((sum, s) => sum + s.netSalary, 0);
    const avgSalary = yearlySalaries.length > 0 ? totalPayroll / yearlySalaries.length : 0;
    const paidCount = yearlySalaries.filter(s => s.paymentStatus === 'paid').length;
    const pendingCount = yearlySalaries.filter(s => s.paymentStatus === 'processed').length;
    
    res.json({
      monthlyStats,
      summary: {
        totalPayroll,
        averageSalary: avgSalary,
        totalEmployees: yearlySalaries.length,
        paidCount,
        pendingCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== CREATE DEFAULT HR ON STARTUP ==========
createDefaultHR();

/* ================= 🔥 IMPORTANT PART STARTS HERE ================= */

// ✅ Serve frontend build (VERY IMPORTANT for production)
app.use(express.static(path.join(__dirname, '../client/dist')));

// ✅ Handle React routing - All non-API routes go to index.html
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

/* ================= 🔥 IMPORTANT PART ENDS HERE ================= */

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server is running!`);
  console.log(`📍 API: http://localhost:${PORT}/api/health`);
  console.log(`📍 Frontend: http://localhost:${PORT}`);
  console.log(`📍 Default HR Login: hr@admin.com / 123456\n`);
});