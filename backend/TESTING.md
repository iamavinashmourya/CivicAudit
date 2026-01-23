# Backend API Testing Guide

This document provides step-by-step instructions to test all backend APIs before handing off to the frontend developer.

## Prerequisites

1. **Backend server running**: `cd backend && npm run dev`
2. **MongoDB connected**: Check console for "MongoDB Connected"
3. **Postman, Thunder Client, or curl** installed

---

## Step 1: Authentication Flow (Get JWT Token)

### 1.1 Send OTP

**Endpoint:** `POST http://localhost:5002/api/auth/send-otp`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "phoneNumber": "+919876543210"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP generated successfully"
}
```

**Check backend console** for the OTP code (e.g., `OTP for +919876543210: 123456`)

### 1.2 Verify OTP

**Endpoint:** `POST http://localhost:5002/api/auth/verify-otp`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requiresOnboarding": true,
  "user": {
    "id": "...",
    "phoneNumber": "+919876543210",
    "name": "",
    "role": "citizen",
    "onboardingCompleted": false
  }
}
```

**Copy the `token` value** - you'll need it for all report API calls.

--- 

## Step 2: Create Report API

### 2.1 POST /api/reports

**Endpoint:** `POST http://localhost:5002/api/reports`

**Headers:**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `title`: `"Pothole on Main Road"`
- `category`: `"Road"`
- `lat`: `22.3072`
- `lng`: `73.1812`
- `image`: (file) Select an image file (JPG/PNG, max 5MB)
  - **Important:** Field name must be exactly `image` (lowercase). The API accepts both `image` and `Image` for compatibility.

**Expected Response (201 Created):**
```json
{
  "success": true,
  "report": {
    "_id": "...",
    "userId": "...",
    "title": "Pothole on Main Road",
    "category": "Road",
    "imageUrl": "/uploads/reports/report-1234567890-987654321.jpg",
    "location": {
      "type": "Point",
      "coordinates": [73.1812, 22.3072]
    },
    "status": "Pending",
    "createdAt": "2026-01-21T..."
  }
}
```

**Test Cases:**
1. ✅ Valid request with all fields → Should return 201
2. ✅ Missing `title` → Should return 400 with error message
3. ✅ Missing `category` → Should return 400 with error message
4. ✅ Missing `lat` or `lng` → Should return 400 with error message
5. ✅ Missing `image` file → Should return 400 with error message
6. ✅ Invalid `lat`/`lng` (non-numeric) → Should return 400
7. ✅ Without Authorization header → Should return 401
8. ✅ Invalid/expired token → Should return 401

---

## Step 3: Get Nearby Reports API

### 3.1 GET /api/reports/nearby

**Endpoint:** `GET http://localhost:5002/api/reports/nearby?lat=22.3072&lng=73.1812`

**Headers:**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "reports": [
    {
      "_id": "...",
      "userId": {
        "_id": "...",
        "name": "John Doe"
      },
      "title": "Pothole on Main Road",
      "category": "Road",
      "imageUrl": "/uploads/reports/report-1234567890-987654321.jpg",
      "location": {
        "type": "Point",
        "coordinates": [73.1812, 22.3072]
      },
      "status": "Pending",
      "createdAt": "2026-01-21T..."
    }
  ]
}
```

**Test Cases:**
1. ✅ Valid coordinates → Should return reports within 2km
2. ✅ No reports nearby → Should return empty array `[]`
3. ✅ Missing `lat` parameter → Should return 400
4. ✅ Missing `lng` parameter → Should return 400
5. ✅ Invalid `lat`/`lng` (non-numeric) → Should return 400
6. ✅ Without Authorization header → Should return 401
7. ✅ Invalid/expired token → Should return 401

---

## Step 4: Verify File Uploads

### 4.1 Check Uploaded Files

After creating a report, verify the image file exists:

**File Path:** `backend/uploads/reports/report-<timestamp>-<random>.jpg`

**Access via Browser:**
```
http://localhost:5002/uploads/reports/report-<timestamp>-<random>.jpg
```

The image should be accessible and display correctly.

---

## Step 5: Database Verification

### 5.1 Check MongoDB

Connect to your MongoDB database and verify:

```javascript
// Connect to MongoDB
use civicaudit

// Check reports collection
db.reports.find().pretty()

// Verify geospatial index exists
db.reports.getIndexes()

// Should see: { "location": "2dsphere" }
```

---

## Quick Test Checklist

- [ ] Backend server starts without errors
- [ ] MongoDB connection successful
- [ ] Send OTP endpoint works
- [ ] Verify OTP endpoint returns JWT token
- [ ] Create report endpoint accepts image upload
- [ ] Report saved to database with correct location format
- [ ] Image file saved to `uploads/reports/` directory
- [ ] Image accessible via `/uploads/reports/...` URL
- [ ] Get nearby reports endpoint returns correct results
- [ ] Nearby reports sorted by distance (closest first)
- [ ] Validation errors return proper status codes
- [ ] Authentication errors return 401
- [ ] Geospatial index exists on reports collection

---

## Common Issues & Solutions

### Issue: "Cannot find module 'multer'"
**Solution:** Run `npm install` in the `backend` directory

### Issue: "MongoDB Connection Error"
**Solution:** Check your `.env` file has correct `MONGODB_URI`

### Issue: "401 Unauthorized" on report endpoints
**Solution:** Make sure you're including `Authorization: Bearer <token>` header

### Issue: "400 Bad Request" on create report
**Solution:** Check that:
- All required fields are present (`title`, `category`, `lat`, `lng`, `image`)
- `lat` and `lng` are valid numbers
- Image file is JPG/PNG and under 5MB

### Issue: Nearby reports returns empty array
**Solution:** 
- Make sure you've created at least one report first
- Check that the `lat`/`lng` in your query are within 2km of the report location
- Verify geospatial index exists: `db.reports.getIndexes()`

---

## API Endpoints Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/send-otp` | No | Send OTP to phone number |
| POST | `/api/auth/verify-otp` | No | Verify OTP and get JWT token |
| POST | `/api/reports` | Yes | Create a new report with image |
| GET | `/api/reports/nearby?lat=...&lng=...` | Yes | Get reports within 2km radius |

---

## Ready for Frontend Integration

Once all tests pass, the backend is ready for frontend integration. Share these endpoints with your frontend developer:

- **Base URL:** `http://localhost:5002/api`
- **Authentication:** JWT token in `Authorization: Bearer <token>` header
- **File Upload:** Use `multipart/form-data` for report creation
- **Response Format:** All responses follow `{ success: boolean, ... }` pattern
