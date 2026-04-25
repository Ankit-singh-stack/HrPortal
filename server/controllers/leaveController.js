import mongoose from 'mongoose';
import { Leave } from '../models/Leave.js';
import { ActivityLog } from '../models/ActivityLog.js';

export const applyLeave = async (req, res) => {
  try {
    const { type, fromDate, toDate, reason } = req.body;
    
    const existingLeave = await Leave.findOne({
      userId: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { fromDate: { $lte: new Date(toDate), $gte: new Date(fromDate) } },
        { toDate: { $lte: new Date(toDate), $gte: new Date(fromDate) } }
      ]
    });
    
    if (existingLeave) {
      return res.status(400).json({ message: 'You already have a leave request for this period' });
    }
    
    const leave = new Leave({
      userId: req.user._id,
      type,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
      status: 'pending'
    });
    
    await leave.save();
    
    await ActivityLog.create({
      userId: req.user._id,
      action: 'LEAVE_APPLIED',
      details: { leaveId: leave._id, type: leave.type, dates: { from: leave.fromDate, to: leave.toDate } }
    });
    
    const io = req.app.get('io');
    if (io) {
      io.to('hr_room').emit('leaveUpdate', { 
        leave,
        action: 'new_request'
      });
    }
    
    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeaves = async (req, res) => {
  try {
    const { userId, status, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (userId) query.userId = userId;
    else if (req.user.role === 'employee') query.userId = req.user._id;
    
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const leaves = await Leave.find(query)
      .populate('userId', 'name email profile')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Leave.countDocuments(query);
    
    res.json({
      leaves,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    leave.status = status;
    if (status === 'rejected') leave.rejectionReason = rejectionReason;
    leave.reviewedBy = req.user._id;
    
    await leave.save();
    
    await ActivityLog.create({
      userId: req.user._id,
      action: `LEAVE_${status.toUpperCase()}`,
      details: { leaveId: leave._id, userId: leave.userId }
    });
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${leave.userId}`).emit('leaveUpdate', { 
        leave,
        action: `leave_${status}`
      });
      io.to('hr_room').emit('leaveUpdate', { 
        leave,
        action: 'status_updated'
      });
      
      io.to(`user_${leave.userId}`).emit('notification', {
        title: `Leave Request ${status.toUpperCase()}`,
        message: `Your leave request from ${new Date(leave.fromDate).toLocaleDateString()} to ${new Date(leave.toDate).toLocaleDateString()} has been ${status}`,
        type: status === 'approved' ? 'success' : 'error'
      });
    }
    
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeaveStats = async (req, res) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || (req.user.role === 'employee' ? req.user._id : null);
    
    if (!targetUserId) {
      return res.json({ pending: 0, approved: 0, rejected: 0, total: 0 });
    }
    
    const stats = await Leave.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(targetUserId)
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };
    
    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};