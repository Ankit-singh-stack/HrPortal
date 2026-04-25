import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d'
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'employee'
    });
    
    await ActivityLog.create({
      userId: user._id,
      action: 'USER_REGISTERED',
      details: { email: user.email, role: user.role }
    });
    
    const token = generateToken(user._id);
    
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    await ActivityLog.create({
      userId: user._id,
      action: 'USER_LOGIN',
      details: { email: user.email }
    });
    
    const token = generateToken(user._id);
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};