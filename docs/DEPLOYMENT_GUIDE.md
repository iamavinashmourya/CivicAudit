# Deployment Guide: Localhost Setup with Ngrok for Hackathon Demo

This guide explains how to deploy CivicAudit for a hackathon demo using:
- **Frontend**: Vercel (or any static hosting)
- **Backend**: Localhost (Node.js)
- **AI Service**: Localhost (Python Flask)
- **Tunnel**: Ngrok (to expose localhost to internet)

## Prerequisites

1. **Node.js** installed (v18+)
2. **Python** installed (v3.8+)
3. **MongoDB** running (local or Atlas)
4. **Ngrok** account and CLI installed
5. **Vercel** account (or similar hosting)

## Step 1: Setup Backend (Localhost)

### 1.1 Install Dependencies
```bash
cd backend
npm install
```

### 1.2 Configure Environment Variables
Create `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/civicaudit
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/civicaudit

PORT=5002
CORS_ORIGIN=http://localhost:3000,https://your-vercel-app.vercel.app

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# AI Service URL (localhost)
AI_SERVICE_URL=http://localhost:5001
```

### 1.3 Start Backend Server
```bash
cd backend
node server.js
```

Backend should be running on `http://localhost:5002`

## Step 2: Setup AI Service (Localhost)

### 2.1 Install Python Dependencies
```bash
cd ai-service  # or wherever your Python AI service is
pip install flask flask-cors pillow requests
```

### 2.2 Start AI Service
```bash
python app.py
```

AI Service should be running on `http://localhost:5001`

## Step 3: Setup Ngrok Tunnel

### 3.1 Install Ngrok
Download from: https://ngrok.com/download

### 3.2 Authenticate (One-time)
```bash
ngrok config add-authtoken YOUR_NGROK_AUTH_TOKEN
```

### 3.3 Start Ngrok Tunnel for Backend
```bash
ngrok http 5002
```

**Important**: Ngrok will give you a URL like:
```
https://a1b2-c3d4-5678.ngrok-free.app
```

**⚠️ CRITICAL**: Save this URL! You'll need it for Vercel configuration.

### 3.4 Keep Ngrok Running
**DO NOT CLOSE** the ngrok terminal during your demo. If you restart ngrok, the URL will change!

## Step 4: Deploy Frontend to Vercel

### 4.1 Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 4.2 Login to Vercel
```bash
vercel login
```

### 4.3 Deploy Frontend
```bash
cd frontend
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No** (first time) or **Yes** (if updating)
- Project name? **civicaudit** (or your choice)
- Directory? **./** (current directory)
- Override settings? **No**

### 4.4 Configure Environment Variables in Vercel

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add/Update `VITE_API_URL`:
   ```
   VITE_API_URL=https://your-ngrok-url.ngrok-free.app/api
   ```
   **Important**: Include `/api` at the end!

5. **Redeploy**:
   - Go to **Deployments** tab
   - Click the **3 dots** (⋮) on latest deployment
   - Click **Redeploy**

## Step 5: Update AI Service Configuration

Make sure your AI service can accept requests from Ngrok URL. Update CORS if needed:

```python
# In your Python Flask app
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["*"])  # For demo only - restrict in production
```

## Step 6: Demo Day Workflow

### Before Demo Starts:

1. **Start MongoDB** (if local):
   ```bash
   mongod
   ```

2. **Start Backend**:
   ```bash
   cd backend
   node server.js
   ```
   Keep this terminal open!

3. **Start AI Service**:
   ```bash
   cd ai-service
   python app.py
   ```
   Keep this terminal open!

4. **Start Ngrok**:
   ```bash
   ngrok http 5002
   ```
   **CRITICAL**: Keep this terminal open! If you close it, the URL changes.

5. **Verify Ngrok URL**:
   - Check the ngrok terminal for the URL
   - If URL changed, update Vercel environment variable and redeploy

6. **Test Everything**:
   - Open Vercel app URL
   - Try creating a report
   - Check if notifications work

### During Demo:

1. **Share Vercel Link** with judges/users
2. **Monitor Terminals**:
   - Backend terminal (check for errors)
   - AI Service terminal (check for processing)
   - Ngrok terminal (ensure it's still running)

3. **If Something Breaks**:
   - Check all terminals are running
   - Check Ngrok URL hasn't changed
   - Check MongoDB is running

### After Demo:

1. Stop all services (Ctrl+C in each terminal)
2. Close Ngrok tunnel

## Troubleshooting

### Problem: Frontend can't connect to backend
**Solution**:
- Check Ngrok is running
- Verify `VITE_API_URL` in Vercel matches Ngrok URL
- Make sure URL includes `/api` at the end
- Redeploy Vercel after changing env vars

### Problem: Ngrok URL changed
**Solution**:
- Update `VITE_API_URL` in Vercel
- Redeploy Vercel app
- **Prevention**: Don't close Ngrok terminal during demo

### Problem: CORS errors
**Solution**:
- Check `CORS_ORIGIN` in backend `.env` includes Vercel URL
- Restart backend after changing `.env`

### Problem: AI Service not responding
**Solution**:
- Check Python service is running on port 5001
- Check `AI_SERVICE_URL` in backend `.env` is correct
- Check Python service logs for errors

### Problem: MongoDB connection failed
**Solution**:
- If local: Check MongoDB is running (`mongod`)
- If Atlas: Check connection string is correct
- Check network connectivity

## Pro Tips

1. **Keep Ngrok Running**: Use a separate terminal window and don't close it
2. **Test Before Demo**: Run through the entire flow before judges arrive
3. **Have Backup Plan**: Screenshot the app in case of network issues
4. **Monitor Logs**: Keep an eye on backend/AI service logs during demo
5. **Stable Network**: Use wired connection if possible for stability

## Environment Variables Summary

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/civicaudit
PORT=5002
CORS_ORIGIN=http://localhost:3000,https://your-app.vercel.app
JWT_SECRET=your-secret-key
AI_SERVICE_URL=http://localhost:5001
```

### Vercel (Environment Variables)
```
VITE_API_URL=https://your-ngrok-url.ngrok-free.app/api
```

## Quick Start Checklist

- [ ] MongoDB running
- [ ] Backend running on port 5002
- [ ] AI Service running on port 5001
- [ ] Ngrok tunnel active (note the URL)
- [ ] Vercel app deployed
- [ ] `VITE_API_URL` set in Vercel (with Ngrok URL)
- [ ] Vercel app redeployed after env var change
- [ ] Tested creating a report
- [ ] Tested notifications
- [ ] All terminals kept open

## Notification System Architecture

The notification system works as follows:

1. **User Creates Report** → Backend saves report
2. **Backend Finds Nearby Users** → Queries users within 2km
3. **Backend Creates Notifications** → One notification per nearby user
4. **Frontend Polls API** → Every 30 seconds fetches new notifications
5. **User Clicks Notification** → Opens report detail modal
6. **User Can Upvote** → Directly from notification modal

### Notification Flow:
```
Report Created
    ↓
Backend: notifyNearbyUsers()
    ↓
Find users within 2km (excluding creator)
    ↓
Create Notification documents
    ↓
Frontend polls /api/notifications every 30s
    ↓
User sees notification
    ↓
User clicks → Opens report detail modal
    ↓
User can upvote/verify
```

## Security Notes for Demo

⚠️ **This setup is for DEMO ONLY. For production:**

1. Use proper hosting (not localhost)
2. Use secure MongoDB (Atlas with IP whitelist)
3. Use environment-specific secrets
4. Enable HTTPS everywhere
5. Rate limit API endpoints
6. Add authentication to AI service
7. Use persistent Ngrok domain (paid plan) or better: proper hosting

## Support

If you encounter issues:
1. Check all services are running
2. Check Ngrok URL is correct
3. Check environment variables
4. Check browser console for errors
5. Check backend/AI service logs

Good luck with your demo! 🚀
