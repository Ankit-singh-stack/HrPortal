import express from 'express';
import passport from 'passport';
import { register, login, googleAuthCallback, getGoogleAuthStatus, updateUserProfile, logout, firebaseGoogleLogin } from '../controllers/authController.js';
import { upload } from '../config/multer.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Basic auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);

// Firebase Google Auth
router.post('/firebase-google', firebaseGoogleLogin);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login` }),
  googleAuthCallback
);
router.get('/google/status', getGoogleAuthStatus);

// Profile routes
router.put('/profile', protect, upload.single('profilePicture'), updateUserProfile);
router.post('/profile', protect, upload.single('profilePicture'), updateUserProfile);

export default router;