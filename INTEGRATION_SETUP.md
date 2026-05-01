# Integration Setup Guide

This guide helps you set up Google Authentication, Razorpay Payments, and Cloudinary Image Upload for your HR Management Portal.

## Prerequisites

- Node.js v14 or higher
- MongoDB database
- Google OAuth credentials
- Razorpay account
- Cloudinary account

---

## 1. Google Authentication Setup

### Step 1.1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the "Google+ API"
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Select "Web application"
6. Add Authorized JavaScript origins:
   - `http://localhost:5173` (development frontend)
   - `http://localhost:5000` (development backend)
   - Your production URLs
7. Add Authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - Your production callback URL
8. Copy the **Client ID** and **Client Secret**

### Step 1.2: Configure Backend (.env)

Add to your `server/.env`:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### Step 1.3: Configure Frontend (.env)

Create `client/.env.local`:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### Step 1.4: Update Login Component

Use the new `GoogleLoginButton` component in your Login page:

```jsx
import GoogleLoginButton from '../components/GoogleLoginButton';

// In your login page:
<GoogleLoginButton />
```

---

## 2. Razorpay Payment Setup

### Step 2.1: Get Razorpay Credentials

1. Sign up at [Razorpay](https://razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Copy your **Key ID** and **Key Secret**
4. For webhooks, go to **Settings** → **Webhooks** and create a webhook for payment events

### Step 2.2: Configure Backend (.env)

Add to your `server/.env`:
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Step 2.3: Configure Frontend (.env)

Add to `client/.env.local`:
```env
VITE_RAZORPAY_KEY_ID=your_key_id
```

### Step 2.4: Use Payment Component

Use the `RazorpayPayment` component in your payment page:

```jsx
import RazorpayPayment from '../components/RazorpayPayment';

<RazorpayPayment 
  amount={5000}
  description="Salary Payment"
  onPaymentSuccess={(response) => {
    console.log('Payment successful:', response);
  }}
  onPaymentFailure={(error) => {
    console.error('Payment failed:', error);
  }}
/>
```

---

## 3. Cloudinary Image Upload Setup

### Step 3.1: Get Cloudinary Credentials

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Go to **Dashboard**
3. Copy your:
   - Cloud Name
   - API Key
   - API Secret

### Step 3.2: Configure Backend (.env)

Add to your `server/.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 3.3: Use Profile Upload Component

Use the `ProfilePictureUpload` component in your profile page:

```jsx
import ProfilePictureUpload from '../components/ProfilePictureUpload';

<ProfilePictureUpload 
  currentImage={user?.profile?.profilePicture}
  onUploadSuccess={(imageUrl) => {
    console.log('New image URL:', imageUrl);
  }}
/>
```

---

## 4. API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/google` | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| PUT | `/api/auth/profile` | Update user profile + upload picture |

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/create-order` | Create Razorpay order |
| POST | `/api/payment/verify` | Verify payment signature |
| POST | `/api/payment/failure` | Handle payment failure |
| GET | `/api/payment/history` | Get user payment history |
| GET | `/api/payment/:paymentId` | Get payment details |

---

## 5. Environment Variables Template

Copy this to both `server/.env` and `client/.env.local`:

### Backend (server/.env)
```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Node Environment
NODE_ENV=development

# Client URLs
CLIENT_URL=http://localhost:5173
RENDER_EXTERNAL_URL=https://your-domain.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Session
SESSION_SECRET=your_session_secret_key_here
```

### Frontend (client/.env.local)
```env
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_RAZORPAY_KEY_ID=your_key_id
```

---

## 6. Installation & Running

### Backend Setup

```bash
cd server
npm install

# Copy .env.example to .env and fill in your credentials
cp .env.example .env

# Start the server
npm start       # Production
npm run dev      # Development with nodemon
```

### Frontend Setup

```bash
cd client
npm install

# Create .env.local and add your API keys
echo "VITE_GOOGLE_CLIENT_ID=..." > .env.local
echo "VITE_RAZORPAY_KEY_ID=..." >> .env.local

# Start the development server
npm run dev
```

---

## 7. Features Enabled

### Google Authentication ✅
- One-click Google login
- Automatic profile syncing with Google profile picture
- Option to link Google account to existing account

### Razorpay Payments ✅
- Create payment orders
- Process payments with signature verification
- Payment history tracking
- Payment failure handling

### Cloudinary Image Upload ✅
- Profile picture upload
- Automatic image optimization
- Secure cloud storage
- Easy image management

---

## 8. Testing

### Test Google Login
1. Navigate to login page
2. Click "Sign in with Google" button
3. Complete Google authentication
4. You'll be automatically logged in

### Test Razorpay Payment
1. Use test credentials: `4111 1111 1111 1111`
2. Any future date and any CVV
3. OTP: `123456`
4. Check payment history after successful payment

### Test Cloudinary Upload
1. Go to profile page
2. Click upload button
3. Select an image (max 5MB)
4. Verify image appears in profile

---

## 9. Production Deployment

### Update CORS Origins
In `server/server.js`, update allowed origins:
```javascript
const allowedOrigins = [
  'https://your-frontend-domain.com',
  'https://your-api-domain.com',
  // ... other origins
];
```

### Set Environment Variables
On your hosting platform (Render, Heroku, etc.), add all `.env` variables in the environment settings.

### Update OAuth Redirect URIs
- Update Google OAuth redirect URLs in Google Cloud Console
- Update Razorpay webhook URLs
- Update Cloudinary CORS settings if needed

---

## 10. Troubleshooting

### Google Login Issues
- ✅ Check Client ID matches environment variable
- ✅ Verify callback URL in Google Cloud Console
- ✅ Check CORS settings in backend

### Razorpay Payment Issues
- ✅ Verify API keys are correct
- ✅ Check payment amount is in paise
- ✅ Ensure order creation succeeded before payment

### Cloudinary Upload Issues
- ✅ Check API credentials are correct
- ✅ Verify file size is under 5MB
- ✅ Check file type is supported image format

---

## 11. Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use strong secrets** - Generate random strings for JWT_SECRET and SESSION_SECRET
3. **Enable HTTPS** - Always use HTTPS in production
4. **Verify signatures** - Always verify Razorpay payment signatures
5. **Validate uploads** - Validate file types and sizes on both client and server
6. **Use secure cookies** - Set `httpOnly` and `sameSite` flags

---

## 12. Support & Resources

- [Google OAuth Documentation](https://developers.google.com/identity)
- [Razorpay API Documentation](https://razorpay.com/docs/)
- [Cloudinary API Documentation](https://cloudinary.com/documentation)
- [Passport.js Documentation](http://www.passportjs.org/)

---

**Happy coding! 🚀**
