import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    // Not required if using Google OAuth
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  role: {
    type: String,
    enum: ['hr', 'employee'],
    default: 'employee'
  },
  profile: {
    designation: String,
    department: String,
    phone: String,
    address: String,
    joinDate: Date,
    profilePicture: String // Cloudinary URL or Google profile picture
  },
  isActive: {
    type: Boolean,
    default: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  // Only hash password if it's modified and user is using local auth
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

export const User = mongoose.model('User', userSchema);