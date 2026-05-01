# HR Management Portal - Integration Guide

## Quick Start

This project now includes integrations for:
- ✅ **Google OAuth** - Seamless login with Google accounts
- ✅ **Razorpay Payments** - Secure payment processing
- ✅ **Cloudinary** - Cloud-based image storage

## Installation

### 1. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd client
npm install
```

### 2. Configure Environment Variables

**Backend (`server/.env`):**
```bash
cp server/.env.example server/.env
# Edit server/.env and fill in your credentials
```

**Frontend (`client/.env.local`):**
```bash
# Add these to client/.env.local or create it
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## Features

### 🔐 Google Authentication
Users can now sign in using their Google accounts. Their profile picture is automatically synced from Google.

**Files Modified:**
- `server/config/passport.js` - Google OAuth configuration
- `server/controllers/authController.js` - Google login handler
- `client/src/components/GoogleLoginButton.jsx` - Login UI component

**Usage:**
```jsx
import GoogleLoginButton from '../components/GoogleLoginButton';

// Add to your Login page
<GoogleLoginButton />
```

### 💳 Razorpay Payments
Process payments securely with Razorpay integration.

**Files Created:**
- `server/controllers/paymentController.js` - Payment logic
- `server/routes/paymentRoutes.js` - Payment routes
- `client/src/components/RazorpayPayment.jsx` - Payment UI

**Usage:**
```jsx
import RazorpayPayment from '../components/RazorpayPayment';

<RazorpayPayment 
  amount={1000}
  description="Salary Payment"
  onPaymentSuccess={(response) => console.log('Success')}
/>
```

### 📸 Cloudinary Image Upload
Upload and manage profile pictures with Cloudinary cloud storage.

**Files Created:**
- `server/utils/cloudinary.js` - Cloudinary configuration
- `server/config/multer.js` - File upload configuration
- `client/src/components/ProfilePictureUpload.jsx` - Upload UI

**Usage:**
```jsx
import ProfilePictureUpload from '../components/ProfilePictureUpload';

<ProfilePictureUpload 
  currentImage={user?.profile?.profilePicture}
  onUploadSuccess={(url) => console.log(url)}
/>
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Google OAuth login
- `PUT /api/auth/profile` - Update profile + upload picture

### Payments
- `POST /api/payment/create-order` - Create payment order
- `POST /api/payment/verify` - Verify payment
- `GET /api/payment/history` - Get payment history

## Key Files Added

```
server/
├── config/
│   ├── multer.js              # File upload config
│   └── passport.js            # Google OAuth config
├── controllers/
│   └── paymentController.js   # Payment logic
├── routes/
│   └── paymentRoutes.js       # Payment endpoints
└── utils/
    ├── cloudinary.js          # Cloudinary integration
    └── razorpay.js            # Razorpay integration

client/
└── src/components/
    ├── GoogleLoginButton.jsx      # Google login UI
    ├── RazorpayPayment.jsx        # Payment UI
    └── ProfilePictureUpload.jsx   # Upload UI
```

## Database Changes

The User model now includes:
- `googleId` - For Google OAuth linking
- `authProvider` - Type of authentication (local/google)
- `profile.profilePicture` - Cloudinary image URL

## Environment Setup

Refer to [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md) for detailed setup instructions for each integration.

## Testing

### Test Credentials
- **Razorpay Test Card:** 4111 1111 1111 1111
- **Any Future Date & CVV**
- **OTP:** 123456

## Production Checklist

- [ ] Update all environment variables on hosting platform
- [ ] Set `NODE_ENV=production`
- [ ] Update CORS origins for your domain
- [ ] Update Google OAuth redirect URLs
- [ ] Update Razorpay webhook URLs
- [ ] Enable HTTPS
- [ ] Test all integrations in staging

## Troubleshooting

See [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md) section 10 for detailed troubleshooting guide.

## Need Help?

Refer to the comprehensive setup guide: [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md)
