import mongoose from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';

export const getActivityLogs = async (req, res) => {
  try {
    const { userId, action, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (userId) query.userId = userId;
    if (action) query.action = action;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const logs = await ActivityLog.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ActivityLog.countDocuments(query);
    
    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserActivitySummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const summary = await ActivityLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$createdAt' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};