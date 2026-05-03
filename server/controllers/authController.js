import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import fs from 'fs';

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
      role: role || 'employee',
      authProvider: 'local'
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

// Google OAuth callback handler
export const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Google authentication failed' });
    }

    await ActivityLog.create({
      userId: user._id,
      action: 'GOOGLE_LOGIN',
      details: { email: user.email, googleId: user.googleId }
    });

    const token = generateToken(user._id);

    const clientUrl = process.env.CLIENT_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://hrportal-client.onrender.com' 
        : 'http://localhost:5173');

    // Redirect to frontend with token
    const redirectUrl = `${clientUrl}/auth-success?token=${token}&userId=${user._id}&name=${user.name}&email=${user.email}&role=${user.role}`;
    res.redirect(redirectUrl);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Google authentication status
export const getGoogleAuthStatus = async (req, res) => {
  try {
    res.json({
      clientId: process.env.GOOGLE_CLIENT_ID
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile with Cloudinary upload
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.params.userId;
    const { name, phone, designation, department, address } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic info
    if (name) user.name = name;
    if (phone) user.profile.phone = phone;
    if (designation) user.profile.designation = designation;
    if (department) user.profile.department = department;
    if (address) user.profile.address = address;

    // Handle profile picture upload
    if (req.file) {
      try {
        // Delete old profile picture if exists
        if (user.profile.profilePicture && user.profile.profilePicture.includes('cloudinary')) {
          // Extract public_id from URL if needed
          const result = await uploadToCloudinary(req.file);
          user.profile.profilePicture = result.url;
        } else {
          const result = await uploadToCloudinary(req.file);
          user.profile.profilePicture = result.url;
        }

        // Delete temporary file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (uploadError) {
        return res.status(400).json({ message: 'Failed to upload profile picture: ' + uploadError.message });
      }
    }

    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'PROFILE_UPDATED',
      details: { email: user.email }
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (userId) {
      await ActivityLog.create({
        userId: userId,
        action: 'USER_LOGOUT',
        details: {}
      });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Firebase Google Login/Register
export const firebaseGoogleLogin = async (req, res) => {
  try {
    const { email, name, googleId, photoURL } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Create user if not exists
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        authProvider: 'google',
        googleId,
        role: 'employee',
        profile: {
          profilePicture: photoURL
        }
      });

      await ActivityLog.create({
        userId: user._id,
        action: 'USER_REGISTERED',
        details: { email: user.email, role: user.role, provider: 'firebase-google' }
      });
    } else {
      // Update googleId and photo if needed
      if (!user.googleId && googleId) user.googleId = googleId;
      if (!user.profile.profilePicture && photoURL) user.profile.profilePicture = photoURL;
      await user.save();
      
      await ActivityLog.create({
        userId: user._id,
        action: 'USER_LOGIN',
        details: { email: user.email, provider: 'firebase-google' }
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

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