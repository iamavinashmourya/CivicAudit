# 🛡️ Gatekeeper Test Guide

Quick test script for image+text detection (AI Gatekeeper).

## ⚡ Quick Start

1. **Start AI Service** (in a separate terminal):
   ```bash
   cd ai-service
   python app.py
   ```

2. **Run Test Script**:
   ```bash
   cd backend
   npm run test-gatekeeper
   # OR
   node test-gatekeeper-quick.js
   ```

3. **Enter OTP** when prompted (check backend console for OTP code)

## 🧪 What It Tests

### Test 1: Mismatch Detection
- **Image**: Generic test image
- **Text**: "Huge fire at the chemical factory"
- **Expected**: `400 REJECTED` (if Gemini detects mismatch)

### Test 2: Matching Scenario
- **Image**: Generic test image  
- **Text**: "Huge fire at the chemical factory"
- **Expected**: `201 CREATED` (if Gemini detects match)

## 📝 Notes

- **Test images are minimal (1x1 pixel)** - may be too generic for Gemini
- **For definitive test**: Use actual images via Postman/Frontend:
  - Cat photo + "fire" text → Should **REJECT**
  - Fire photo + "fire" text → Should **ACCEPT**

## 🔍 Check Logs

- **AI Service Console**: Shows Gemini API calls and responses
- **Backend Console**: Shows AI service integration logs
- **Gatekeeper Logs**: Shows image analysis results

## ✅ Success Indicators

- ✅ Integration working: Backend sends image+text to AI
- ✅ AI Service connected: No connection errors
- ✅ Gemini configured: API key is set
- ✅ Gatekeeper active: Rejects mismatches (when detectable)

---

**For Hackathon**: This script provides quick validation. For production testing, use actual images with clear mismatches.
