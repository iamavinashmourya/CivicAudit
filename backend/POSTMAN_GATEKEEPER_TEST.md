# 🛡️ Postman Gatekeeper Test Guide

Complete guide to test the AI Gatekeeper (image+text detection) using Postman.

## 📋 Prerequisites

1. **Backend running**: `cd backend && npm run dev` (port 5002)
2. **AI Service running**: `cd ai-service && python app.py` (port 5001)
3. **Postman installed**: [Download Postman](https://www.postman.com/downloads/)

## 🔐 Step 1: Get Authentication Token

### Request 1: Send OTP
- **Method**: `POST`
- **URL**: `http://localhost:5002/api/auth/send-otp`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "phoneNumber": "+911111111111"
  }
  ```
- **Response**: Check backend console for OTP code

### Request 2: Verify OTP
- **Method**: `POST`
- **URL**: `http://localhost:5002/api/auth/verify-otp`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "phoneNumber": "+911111111111",
    "otp": "123456"
  }
  ```
- **Response**: Copy the `token` from response
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
  ```

---

## 🧪 Step 2: Test Gatekeeper

### Test 1: MISMATCH (Should REJECT) ⛔

**Goal**: Upload a cat photo with "fire" text → Should be rejected by gatekeeper

- **Method**: `POST`
- **URL**: `http://localhost:5002/api/reports`
- **Headers**:
  ```
  Authorization: Bearer YOUR_TOKEN_HERE
  ```
  ⚠️ **Important**: Do NOT set `Content-Type` header manually - Postman will set it automatically for `form-data`

- **Body** (form-data):
  | Key | Type | Value |
  |-----|------|-------|
  | `title` | Text | `Huge fire at the chemical factory` |
  | `description` | Text | `Black smoke everywhere, people running, very dangerous` |
  | `category` | Text | `Disaster` |
  | `lat` | Text | `22.3072` |
  | `lng` | Text | `73.1812` |
  | `image` | File | **Select a cat photo** (any cat image from internet) |

- **Expected Response** (400 REJECTED):
  ```json
  {
    "success": false,
    "message": "Report Rejected by AI",
    "reason": "Image does not match description"
  }
  ```

- **✅ Success Indicator**: Status code `400` with rejection message

---

### Test 2: MATCH (Should ACCEPT) ✅

**Goal**: Upload a fire photo with "fire" text → Should be accepted

- **Method**: `POST`
- **URL**: `http://localhost:5002/api/reports`
- **Headers**:
  ```
  Authorization: Bearer YOUR_TOKEN_HERE
  ```

- **Body** (form-data):
  | Key | Type | Value |
  |-----|------|-------|
  | `title` | Text | `Huge fire at the chemical factory` |
  | `description` | Text | `Black smoke everywhere, people running, very dangerous` |
  | `category` | Text | `Disaster` |
  | `lat` | Text | `22.3072` |
  | `lng` | Text | `73.1812` |
  | `image` | File | **Select a fire/smoke photo** (any fire image from internet) |

- **Expected Response** (201 CREATED):
  ```json
  {
    "success": true,
    "report": {
      "_id": "...",
      "title": "Huge fire at the chemical factory",
      "status": "Verified",
      "aiAnalysis": {
        "priority": "CRITICAL",
        "isCritical": true,
        "sentimentScore": -0.8,
        "keywords": ["fire", "smoke"]
      }
    }
  }
  ```

- **✅ Success Indicator**: Status code `201` with report created and `status: "Verified"`

---

## 📊 What to Check

### ✅ Success Indicators

1. **Test 1 (Mismatch)**:
   - Status: `400 Bad Request`
   - Response contains: `"success": false`
   - Response contains: `"reason"` or `"message"` about rejection

2. **Test 2 (Match)**:
   - Status: `201 Created`
   - Response contains: `"success": true`
   - Report has `"status": "Verified"` (auto-verified for CRITICAL)
   - Report has `"aiAnalysis.priority": "CRITICAL"`

### 🔍 Debugging

**If Test 1 doesn't reject:**
- Check AI service console for Gemini logs
- Look for: `[Gatekeeper] Analyzing image...`
- Check what Gemini returned: `is_match: true/false`
- Verify image is actually a cat photo (not too generic)

**If Test 2 doesn't accept:**
- Check AI service console for errors
- Verify image is actually a fire photo
- Check backend console for AI service connection errors

---

## 🖼️ Where to Get Test Images

### Cat Photo (for mismatch test):
- Search Google Images: "cat photo"
- Download any clear cat image
- Save as: `cat-test.jpg` or `cat-test.png`

### Fire Photo (for match test):
- Search Google Images: "fire smoke disaster"
- Download any fire/smoke image
- Save as: `fire-test.jpg` or `fire-test.png`

---

## 📝 Postman Collection Setup

### Create Environment Variables:
1. Click **Environments** → **+** (Create new)
2. Add variables:
   - `base_url`: `http://localhost:5002`
   - `token`: (will be set after OTP verification)
   - `phone`: `+911111111111`

### Create Collection:
1. **Collection**: "CivicAudit Gatekeeper Tests"
2. **Request 1**: "1. Send OTP"
3. **Request 2**: "2. Verify OTP" (use Tests tab to save token)
4. **Request 3**: "3. Test Mismatch (Cat + Fire text)"
5. **Request 4**: "4. Test Match (Fire + Fire text)"

### Auto-save Token (Optional):
In "2. Verify OTP" request, add to **Tests** tab:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.token) {
        pm.environment.set("token", jsonData.token);
        console.log("Token saved:", jsonData.token);
    }
}
```

Then in subsequent requests, use: `{{token}}` in Authorization header.

---

## 🎯 Quick Test Checklist

- [ ] Backend running on port 5002
- [ ] AI service running on port 5001
- [ ] Got OTP and verified (have token)
- [ ] Test 1: Cat photo + "fire" text → **400 REJECTED** ✅
- [ ] Test 2: Fire photo + "fire" text → **201 CREATED** ✅
- [ ] Checked AI service console for Gemini logs
- [ ] Verified gatekeeper is working correctly

---

## 🚀 For Hackathon Demo

**Demo Flow:**
1. Show Test 1 (mismatch) → Gets rejected → "Gatekeeper blocked fake report"
2. Show Test 2 (match) → Gets accepted → "Real report verified by AI"
3. Show AI service console → "Gemini analyzing images in real-time"

**Key Points:**
- ✅ AI Gatekeeper prevents fake reports
- ✅ Community can still downvote if AI misses something
- ✅ Two-layer defense: AI + Civic Jury

---

**Happy Testing! 🎉**
