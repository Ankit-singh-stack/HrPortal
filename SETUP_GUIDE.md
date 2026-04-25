# 🚀 HR Portal - Setup & Testing Guide

## ⚠️ Common Issue: 404 Errors on API Calls

The 404 errors you're seeing indicate that the frontend isn't able to reach the backend API. This usually happens when:
- Backend isn't running
- Frontend is using the wrong API URL
- Services aren't properly separated (local vs production)

---

## 🏠 LOCAL DEVELOPMENT

### **Step 1: Start the Backend Server**
```bash
cd server
npm install  # (first time only)
npm start
```
✅ You should see:
```
🚀 Server is running!
📍 API: http://localhost:5000/api/health
📍 Default HR Login: hr@admin.com / 123456
```

### **Step 2: Start the Frontend (In a NEW Terminal)**
```bash
cd client
npm install  # (first time only)
npm run dev
```
✅ Frontend will be at: `http://localhost:5173`
✅ The Vite proxy will automatically forward `/api` requests to `http://localhost:5000`

### **Step 3: Test API Connection**
1. Open browser DevTools (F12) → Console
2. You should **NOT** see 404 errors for `/api/...` endpoints
3. Login with: `hr@admin.com / 123456`

---

## 🌐 PRODUCTION (Render)

### **Requirements:**
- Frontend deployed as **Static Site** service
- Backend deployed as **Web Service** service

### **Configuration:** ✅ Already Done
- `client/.env.production` → `VITE_API_URL=https://hrportal-server-7hkl.onrender.com/api`
- `server/render.yaml` → Configured for both services

### **Redeploy Steps:**
1. Push changes: `git push` ✅ (Already done)
2. Go to Render Dashboard → Redeploy both services
3. Monitor logs to ensure both start successfully

---

## 🔧 Troubleshooting

### ❌ "Failed to load resource: 404" on `/api/...` endpoints

**Check 1: Is the backend running?**
```bash
curl http://localhost:5000/api/health
```
Should return: `{"message":"Server is running","status":"ok","timestamp":"..."}`

**Check 2: Is the API URL correct?**
- Local dev: Should be `http://localhost:5000/api` (via Vite proxy)
- Production: Should be `https://hrportal-server-7hkl.onrender.com/api`

**Check 3: Do you have a browser extension blocking requests?**
- The error shows "No auth token found" from contentScript - this is normal
- But if requests fail, check browser extensions

---

## 📝 Default Credentials

| Role     | Email              | Password |
|----------|-------------------|----------|
| HR Admin | `hr@admin.com`    | `123456` |

---

## 📊 Expected File Structure

```
Hr-mangemet-portal/
├── client/
│   ├── .env                      ← Local dev config
│   ├── .env.production           ← Production config ✅
│   ├── vite.config.js            ← Proxy configured ✅
│   └── src/services/api.js       ← Uses VITE_API_URL ✅
└── server/
    ├── server.js                 ← API routes + logging ✅
    ├── render.yaml               ← Deployment config ✅
    └── package.json
```

---

## ✅ What We Fixed

1. ✅ **API URL Configuration** - Fixed production URL to point to actual backend
2. ✅ **Vite Proxy** - Changed from production URL to localhost for local dev
3. ✅ **Environment Variables** - Properly configured for both dev and production
4. ✅ **Request Logging** - Added logging to backend for debugging
5. ✅ **Render Deployment** - Added proper environment variable for CORS

---

## 🎯 Next Steps

1. **Test locally first**: Run backend + frontend and verify no 404 errors
2. **Check browser console**: Should see successful API calls with responses
3. **Deploy to Render**: Push → Wait for deployment → Test production URL
4. **Monitor**: Check Render logs if issues persist

---

## 📞 Quick Command Reference

```bash
# Local Development
cd server && npm start          # Terminal 1
cd client && npm run dev        # Terminal 2

# Production Build
cd client && npm run build       # Creates dist/ folder

# Testing Backend
curl http://localhost:5000/api/health

# Push Changes
git add . && git commit -m "message"
git push
```

