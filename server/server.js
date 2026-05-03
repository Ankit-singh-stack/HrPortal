import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';

// Import passport config
import './config/passport.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import salaryPaymentRoutes from './routes/salaryPaymentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import userRoutes from './routes/userRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import documentRoutes from './routes/documentRoutes.js';

// Import middleware
import { protect } from './middleware/auth.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

// Fix for __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ========== DATABASE CONNECTION ==========
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGO_URI is not defined in environment variables!');
      throw new Error('MONGO_URI missing');
    }

    console.log(`⏳ Connecting to MongoDB... (URI length: ${mongoUri.length})`);
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Stack Trace:', error.stack);
    throw error; // Re-throw to be caught in startServer
  }
};

// ========== CORS CONFIGURATION ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://hrportal-client.onrender.com',
  'https://hr-portal-server.onrender.com',
  process.env.CLIENT_URL,
  process.env.RENDER_EXTERNAL_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Allow in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== SESSION CONFIGURATION FOR PASSPORT ==========
app.use(session({
  secret: process.env.SESSION_SECRET || 'session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// ========== PASSPORT INITIALIZATION ==========
app.use(passport.initialize());
app.use(passport.session());

// ========== REQUEST LOGGING MIDDLEWARE ==========
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// ========== API ROUTES ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', status: 'ok', timestamp: new Date() });
});

// ========== ROUTE MIDDLEWARE ==========
// Use imported routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/salary-payment', salaryPaymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/users', userRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/documents', documentRoutes);

// ========== ROOT ENDPOINT ==========
app.get('/', (req, res) => {
  res.send('HR Portal Backend API is running');
});

// ========== ERROR HANDLING MIDDLEWARE ==========
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ========== START SERVER ==========
const basePort = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === 'production';

function listenOnPort(port) {
  return new Promise((resolve, reject) => {
    const srv = app.listen(port, () => resolve(srv));
    srv.once('error', reject);
  });
}

const startServer = async () => {
  try {
    await connectDB();

    let port = basePort;
    let server;
    const maxTries = isProduction ? 1 : 25;

    for (let attempt = 0; attempt < maxTries; attempt++) {
      try {
        server = await listenOnPort(port);
        if (!isProduction && attempt > 0) {
          console.warn(
            `\n⚠️  Port ${basePort} was busy — server is on ${port}.\n` +
              `   Update client/.env: VITE_API_URL=http://localhost:${port}/api\n` +
              `   Or stop the other Node process and use PORT=${basePort} only once.\n`
          );
        }
        break;
      } catch (err) {
        if (err.code === 'EADDRINUSE' && !isProduction) {
          console.warn(`⚠️  Port ${port} in use, trying ${port + 1}...`);
          port++;
          continue;
        }
        if (err.code === 'EADDRINUSE') {
          console.error(
            `\n❌ Port ${port} is already in use (production). Stop the other process or set PORT in .env.\n`
          );
        } else {
          console.error('❌ Server listen error:', err.message);
        }
        process.exit(1);
      }
    }

    if (!server) {
      console.error('❌ Could not bind to a port.');
      process.exit(1);
    }

    console.log(`\n🚀 Server is running!`);
    console.log(`📍 API: http://localhost:${port}/api/health`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Database: MongoDB Connected`);
    console.log(`🔐 Integrations: Google OAuth, Razorpay, Cloudinary\n`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    if (error.stack) console.error('Stack Trace:', error.stack);
    process.exit(1);
  }
};

startServer();