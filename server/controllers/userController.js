import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';

export const getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = {};
    
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const { name, profile, role, isActive, bankDetails } = req.body;
    
    if (name) user.name = name;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (role && req.user.role === 'hr') user.role = role;
    if (isActive !== undefined && req.user.role === 'hr') user.isActive = isActive;

    const self = req.user._id.toString() === user._id.toString();
    if (bankDetails && (req.user.role === 'hr' || self)) {
      user.bankDetails = { ...(user.bankDetails || {}), ...bankDetails };
      user.razorpayFundAccountId = undefined;
      user.payoutBankKey = undefined;
    }
    
    await user.save();
    
    await ActivityLog.create({
      userId: req.user._id,
      action: 'USER_UPDATED',
      details: { targetUser: user.email, updates: req.body }
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.deleteOne();
    
    await ActivityLog.create({
      userId: req.user._id,
      action: 'USER_DELETED',
      details: { deletedUser: user.email }
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};