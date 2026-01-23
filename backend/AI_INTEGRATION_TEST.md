# AI Service Integration Testing Guide

## Prerequisites

1. **Backend Server** running on `http://localhost:5002`
2. **AI Service** (optional) on `http://localhost:5001`
   - If AI service is down, reports will still be created with default values

## Testing Steps

### Step 1: Start AI Service (Optional)

```bash
cd ai-service
python app.py
```

Expected output: `Running on http://0.0.0.0:5001`

### Step 2: Get Authentication Token

**Using Postman/Thunder Client:**

1. **Send OTP:**
   - Method: `POST`
   - URL: `http://localhost:5002/api/auth/send-otp`
   - Body (JSON):
     ```json
     {
       "phoneNumber": "+911111111111"
     }
     ```

2. **Check Backend Console** for OTP code (e.g., `OTP for +911111111111: 123456`)

3. **Verify OTP:**
   - Method: `POST`
   - URL: `http://localhost:5002/api/auth/verify-otp`
   - Body (JSON):
     ```json
     {
       "phoneNumber": "+911111111111",
       "otp": "123456"
     }
     ```

4. **Copy the `token`** from response

### Step 3: Test Report Creation with AI

**Using Postman/Thunder Client:**

1. **Create Report:**
   - Method: `POST`
   - URL: `http://localhost:5002/api/reports`
   - Headers:
     ```
     Authorization: Bearer <YOUR_TOKEN>
     ```
   - Body (form-data):
     - `title`: `Huge fire at the chemical factory`
     - `description`: `There is black smoke everywhere and people are running. It is very dangerous.`
     - `category`: `Disaster`
     - `lat`: `22.3072`
     - `lng`: `73.1812`
     - `image`: [Select any image file]

2. **Expected Response (201 Created):**

```json
{
  "success": true,
  "report": {
    "_id": "...",
    "title": "Huge fire at the chemical factory",
    "description": "There is black smoke everywhere...",
    "category": "Disaster",
    "imageUrl": "/uploads/reports/report-...",
    "location": {
      "type": "Point",
      "coordinates": [73.1812, 22.3072]
    },
    "status": "Pending",
    "aiAnalysis": {
      "priority": "CRITICAL",
      "isCritical": true,
      "sentimentScore": -0.8,
      "keywords": ["fire", "smoke"],
      "processedAt": "2026-01-23T..."
    },
    "score": 0,
    "createdAt": "2026-01-23T..."
  }
}
```

### Step 4: Verify AI Analysis

**If AI Service is Running:**
- `priority` should be `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW` based on text
- `isCritical` should be `true` for `CRITICAL` priority
- `sentimentScore` should be between -1 and 1
- `keywords` should contain relevant keywords from the text

**If AI Service is Down:**
- `priority` will be `LOW` (default)
- `isCritical` will be `false` (default)
- `sentimentScore` will be `0` (default)
- `keywords` will be `[]` (default)
- Report will still be created successfully ✅

### Step 5: Check Backend Console Logs

**If AI Service is Running:**
```
🤖 AI Service Success: CRITICAL
```

**If AI Service is Down:**
```
⚠️ AI Service Error (Continuing anyway): connect ECONNREFUSED 127.0.0.1:5001
```

## Test Cases

### Test Case 1: Report with Description (AI Service Running)
- **Input:** Title + Description with danger keywords ("fire", "smoke")
- **Expected:** `priority: "CRITICAL"`, `isCritical: true`, keywords populated

### Test Case 2: Report without Description (AI Service Running)
- **Input:** Only title
- **Expected:** AI analyzes title, priority based on title content

### Test Case 3: Report with AI Service Down
- **Input:** Any report
- **Expected:** Report created with default AI values (`priority: "LOW"`)

### Test Case 4: Report with Empty Text
- **Input:** Title/description too short (< 3 characters)
- **Expected:** Default AI values used

## Troubleshooting

### Issue: "AI Service Error" in console but report created
- **Solution:** This is expected behavior. Reports are created even if AI service fails.

### Issue: No `aiAnalysis` in response
- **Solution:** Check that the Report model was updated correctly. Restart backend server.

### Issue: AI service returns error
- **Solution:** Check AI service logs. Ensure Python dependencies are installed:
  ```bash
  pip install flask flask-cors python-dotenv textblob requests
  python -m textblob.download_corpora
  ```

### Issue: Keywords are empty array
- **Solution:** This is normal if no keywords were detected. Try text with danger words like "fire", "smoke", "accident".

## Quick Test Script

Run the automated test script:

```bash
cd backend
node quick-ai-test.js
```

**Note:** You'll need to manually verify OTP and update the token in the script, or use Postman for easier testing.

## Verification in MongoDB

Check the report in MongoDB:

```javascript
db.reports.findOne({ title: "Huge fire at the chemical factory" })
```

Look for the `aiAnalysis` field:
```json
{
  "aiAnalysis": {
    "priority": "CRITICAL",
    "isCritical": true,
    "sentimentScore": -0.8,
    "keywords": ["fire", "smoke"],
    "processedAt": ISODate("2026-01-23T...")
  }
}
```
