import { Salary } from '../models/Salary.js';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';

// Calculate net salary
const calculateNetSalary = (basicSalary, allowances, deductions, bonus, overtime) => {
  const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0);
  const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + (val || 0), 0);
  const overtimeAmount = (overtime?.hours || 0) * (overtime?.rate || 0);
  
  return basicSalary + totalAllowances + (bonus || 0) + overtimeAmount - totalDeductions;
};

// Process salary (HR only)
export const processSalary = async (req, res) => {
  try {
    const { 
      userId, month, year, basicSalary, allowances, deductions, 
      bonus, overtime, paymentMethod, bankAccount, remarks 
    } = req.body;
    
    // Check if salary already processed for this month
    const existingSalary = await Salary.findOne({ userId, month, year });
    if (existingSalary) {
      return res.status(400).json({ message: 'Salary already processed for this month' });
    }
    
    const netSalary = calculateNetSalary(basicSalary, allowances, deductions, bonus, overtime);
    
    const salary = new Salary({
      userId,
      month,
      year,
      basicSalary,
      allowances,
      deductions,
      bonus: bonus || 0,
      overtime: overtime || { hours: 0, rate: 0, amount: 0 },
      netSalary,
      paymentMethod,
      bankAccount,
      remarks,
      processedBy: req.user._id,
      paymentStatus: 'processed'
    });
    
    await salary.save();
    
    await ActivityLog.create({
      userId: req.user._id,
      action: 'SALARY_PROCESSED',
      details: { userId, month, year, netSalary }
    });
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('salaryUpdate', {
        message: `Your salary for ${month + 1}/${year} has been processed`,
        salary
      });
    }
    
    res.status(201).json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update salary (HR only)
export const updateSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const { basicSalary, allowances, deductions, bonus, overtime, paymentStatus, remarks } = req.body;
    
    const salary = await Salary.findById(id);
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
    
    await salary.save();
    
    await ActivityLog.create({
      userId: req.user._id,
      action: 'SALARY_UPDATED',
      details: { salaryId: id, userId: salary.userId }
    });
    
    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all salaries (HR only)
export const getAllSalaries = async (req, res) => {
  try {
    const { month, year, userId, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (month !== undefined && year) {
      query.month = parseInt(month);
      query.year = parseInt(year);
    }
    if (userId) query.userId = userId;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const salaries = await Salary.find(query)
      .populate('userId', 'name email profile department')
      .populate('processedBy', 'name email')
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Salary.countDocuments(query);
    
    res.json({
      salaries,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get employee salary (Employee view)
export const getMySalary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = { userId: req.user._id };
    
    if (month && year) {
      query.month = parseInt(month);
      query.year = parseInt(year);
    }
    
    const salaries = await Salary.find(query)
      .populate('processedBy', 'name email')
      .sort({ year: -1, month: -1 });
    
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get salary by ID
export const getSalaryById = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id)
      .populate('userId', 'name email profile department')
      .populate('processedBy', 'name email');
    
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }
    
    // Check authorization
    if (req.user.role !== 'hr' && salary.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark salary as paid (HR only)
export const markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;
    
    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }
    
    salary.paymentStatus = 'paid';
    salary.paymentDate = new Date();
    if (paymentMethod) salary.paymentMethod = paymentMethod;
    if (transactionId) salary.bankAccount = transactionId;
    
    await salary.save();
    
    await ActivityLog.create({
      userId: req.user._id,
      action: 'SALARY_PAID',
      details: { salaryId: id, userId: salary.userId }
    });
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${salary.userId}`).emit('salaryUpdate', {
        message: `Your salary has been paid`,
        salary
      });
    }
    
    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get salary statistics
export const getSalaryStats = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    const stats = await Salary.aggregate([
      {
        $match: { year: targetYear }
      },
      {
        $group: {
          _id: '$month',
          totalSalary: { $sum: '$netSalary' },
          averageSalary: { $avg: '$netSalary' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    const summary = await Salary.aggregate([
      {
        $match: { year: targetYear }
      },
      {
        $group: {
          _id: null,
          totalPayroll: { $sum: '$netSalary' },
          averageSalary: { $avg: '$netSalary' },
          totalEmployees: { $sum: 1 },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'processed'] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.json({
      monthlyStats: stats,
      summary: summary[0] || {
        totalPayroll: 0,
        averageSalary: 0,
        totalEmployees: 0,
        paidCount: 0,
        pendingCount: 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};