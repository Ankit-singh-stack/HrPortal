import mongoose from 'mongoose';
import { Attendance } from '../models/Attendance.js';
import { ActivityLog } from '../models/ActivityLog.js';

export const markAttendance = async (req, res) => {
  try {
    const { status, checkInTime, checkOutTime, notes } = req.body;
    const userId = req.params.userId || req.user._id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let attendance = await Attendance.findOne({
      userId,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });
    
    if (attendance) {
      attendance.status = status || attendance.status;
      attendance.checkInTime = checkInTime || attendance.checkInTime;
      attendance.checkOutTime = checkOutTime || attendance.checkOutTime;
      attendance.notes = notes || attendance.notes;
    } else {
      attendance = new Attendance({
        userId,
        status: status || 'present',
        checkInTime,
        checkOutTime,
        notes
      });
    }
    
    await attendance.save();
    
    await ActivityLog.create({
      userId: req.user._id,
      action: 'ATTENDANCE_MARKED',
      details: { userId, date: today, status }
    });
    
    const io = req.app.get('io');
    if (io) {
      io.to('hr_room').emit('attendanceUpdate', { 
        userId, 
        attendance,
        date: today 
      });
    }
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (userId) query.userId = userId;
    else if (req.user.role === 'employee') query.userId = req.user._id;
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const attendance = await Attendance.find(query)
      .populate('userId', 'name email profile')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Attendance.countDocuments(query);
    
    res.json({
      attendance,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttendanceStats = async (req, res) => {
  try {
    const { userId, month, year } = req.query;
    const targetUserId = userId || (req.user.role === 'employee' ? req.user._id : null);
    
    if (!targetUserId) {
      return res.json({ present: 0, absent: 0, late: 0, halfDay: 0, total: 0 });
    }
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, parseInt(month) + 1, 0);
    
    const stats = await Attendance.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(targetUserId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const total = stats.reduce((sum, item) => sum + item.count, 0);
    const result = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      total
    };
    
    stats.forEach(stat => {
      if (stat._id === 'present') result.present = stat.count;
      if (stat._id === 'absent') result.absent = stat.count;
      if (stat._id === 'late') result.late = stat.count;
      if (stat._id === 'half-day') result.halfDay = stat.count;
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('userId', 'name email profile');
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};