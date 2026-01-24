const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');

const router = express.Router();

// Utility to generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate phone number to detect fake numbers
function isValidPhoneNumber(phoneNumber) {
  // Remove any non-digit characters for validation
  let digits = phoneNumber.replace(/\D/g, '');
  
  // Remove country code if present (91 for India)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  } else if (digits.length === 13 && digits.startsWith('9191')) {
    // Handle double country code
    digits = digits.substring(4);
  }
  
  // Must be 10 digits (Indian phone number format)
  if (digits.length !== 10) {
    return { valid: false, reason: 'Enter real number' };
  }

  // Check if all digits are the same (1111111111, 2222222222, etc.)
  const allSame = digits.split('').every(digit => digit === digits[0]);
  if (allSame) {
    return { valid: false, reason: 'Invalid number' };
  }

  // Check for sequential numbers (1234567890, 9876543210, etc.)
  let isSequential = true;
  let isReverseSequential = true;
  
  for (let i = 1; i < digits.length; i++) {
    const current = parseInt(digits[i]);
    const previous = parseInt(digits[i - 1]);
    
    // Check forward sequence
    if (current !== previous + 1) {
      isSequential = false;
    }
    
    // Check reverse sequence
    if (current !== previous - 1) {
      isReverseSequential = false;
    }
  }
  
  if (isSequential || isReverseSequential) {
    return { valid: false, reason: 'Invalid number' };
  }

  // Check for repeating patterns (only block obvious fake patterns)
  // Check 2-digit pattern - only block if pattern repeats 5+ times (too obvious)
  if (digits.length >= 4) {
    const pattern2 = digits.substring(0, 2);
    const repeats2 = digits.match(new RegExp(pattern2, 'g'));
    if (repeats2 && repeats2.length >= 5) {
      return { valid: false, reason: 'Invalid number' };
    }
  }
  
  // Check 3-digit pattern - only block if pattern repeats 4+ times
  if (digits.length >= 6) {
    const pattern3 = digits.substring(0, 3);
    const repeats3 = digits.match(new RegExp(pattern3, 'g'));
    if (repeats3 && repeats3.length >= 4) {
      return { valid: false, reason: 'Invalid number' };
    }
  }

  // Check for common fake patterns
  const fakePatterns = [
    '1234567890',
    '0987654321',
    '0123456789',
    '9876543210',
    '1111111111',
    '2222222222',
    '3333333333',
    '4444444444',
    '5555555555',
    '6666666666',
    '7777777777',
    '8888888888',
    '9999999999',
    '0000000000',
  ];
  
  if (fakePatterns.includes(digits)) {
    return { valid: false, reason: 'Invalid number' };
  }

  // Check if it starts with 0 (not valid for Indian numbers)
  if (digits[0] === '0') {
    return { valid: false, reason: 'Invalid number' };
  }

  // Check if it's a valid Indian mobile number (starts with 6-9)
  if (!/^[6-9]/.test(digits)) {
    return { valid: false, reason: 'Invalid number' };
  }

  return { valid: true };
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;

    // Validate phoneNumber
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    const normalizedPhoneNumber = phoneNumber.trim();
    
    // Validate phone number format and detect fake numbers
    const phoneValidation = isValidPhoneNumber(normalizedPhoneNumber);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.reason || 'Invalid phone number format',
      });
    }
    const now = new Date();
    const existing = await OTP.findOne({ phoneNumber: normalizedPhoneNumber });

    // Enforce 59s resend cooldown
    if (existing && existing.lastSentAt && now - existing.lastSentAt < 59 * 1000) {
      const waitSeconds = 59 - Math.floor((now - existing.lastSentAt) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds}s before requesting a new OTP`,
      });
    }

    const code = generateOtp();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    await OTP.findOneAndUpdate(
      { phoneNumber: normalizedPhoneNumber },
      { code, expiresAt, lastSentAt: now, attempts: 0 },
      { upsert: true, new: true }
    );

    // Hackathon-only: log OTP to server console instead of sending SMS
    console.log(`OTP for ${normalizedPhoneNumber}: ${code}${name ? ` (name: ${name})` : ''}`);

    return res.json({
      success: true,
      message: 'OTP generated successfully',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, name, otp } = req.body;

    // Validate phoneNumber and otp
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    if (!otp || typeof otp !== 'string' || otp.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'OTP is required',
      });
    }

    const normalizedPhoneNumber = phoneNumber.trim();
    
    // Validate phone number format and detect fake numbers
    const phoneValidation = isValidPhoneNumber(normalizedPhoneNumber);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.reason || 'Invalid phone number format',
      });
    }

    const record = await OTP.findOne({ phoneNumber: normalizedPhoneNumber });
    const now = new Date();

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found. Please request a new one.',
      });
    }

    if (record.expiresAt < now) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    if (record.code !== otp.trim()) {
      // Increment attempts but do not block for now (hackathon)
      record.attempts += 1;
      await record.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    // OTP is valid – delete record
    await OTP.deleteOne({ _id: record._id });

    // Find or create user using findOneAndUpdate to handle race conditions atomically
    // This prevents duplicate key errors when multiple requests try to create the same user
    
    // First, try to find existing user
    let user = await User.findOne({ phoneNumber: normalizedPhoneNumber });
    const isNewUser = !user;

    if (!user) {
      // User doesn't exist - try to create it
      // First, clean up any orphaned documents with null phoneNumber (from old schema)
      try {
        await User.deleteMany({ 
          $or: [
            { phoneNumber: null },
            { phoneNumber: { $exists: false } },
            { mobileNumber: { $exists: true } } // Clean up old schema documents
          ]
        });
      } catch (cleanupError) {
        // Ignore cleanup errors, continue with user creation
        console.warn('Cleanup warning:', cleanupError.message);
      }

      // Prepare user data
      const userData = {
        phoneNumber: normalizedPhoneNumber,
        role: 'citizen',
        location: {
          type: 'Point',
          coordinates: [0, 0],
        },
      };

      if (name && typeof name === 'string' && name.trim()) {
        userData.name = name.trim();
      }

      try {
        // Try to create new user
        user = new User(userData);
        await user.save();
      } catch (createError) {
        // Handle duplicate key error - user might have been created by another request
        if (createError.code === 11000) {
          // Try to find the user again (might have been created by concurrent request)
          user = await User.findOne({ phoneNumber: normalizedPhoneNumber });
          
          if (!user) {
            // Still can't find user - there might be a document with null phoneNumber
            // Try to find and update it
            const nullUser = await User.findOne({ 
              $or: [
                { phoneNumber: null },
                { phoneNumber: { $exists: false } }
              ]
            });
            
            if (nullUser) {
              // Update the null user with the correct phone number
              nullUser.phoneNumber = normalizedPhoneNumber;
              if (name && typeof name === 'string' && name.trim()) {
                nullUser.name = name.trim();
              }
              await nullUser.save();
              user = nullUser;
            } else {
              // Last resort: try findOneAndUpdate with upsert
              // If this still fails, it might be due to an old index on mobileNumber
              try {
                user = await User.findOneAndUpdate(
                  { phoneNumber: normalizedPhoneNumber },
                  { $set: userData },
                  { upsert: true, new: true, runValidators: true }
                );
              } catch (upsertError) {
                // If upsert also fails with duplicate key, try one more time to find user
                if (upsertError.code === 11000) {
                  // Wait a bit and try to find the user (might have been created)
                  await new Promise(resolve => setTimeout(resolve, 100));
                  user = await User.findOne({ phoneNumber: normalizedPhoneNumber });
                  
                  if (!user) {
                    // If still not found, the database might have an old index issue
                    // Check which index is causing the problem
                    const indexName = upsertError.keyPattern ? 
                      Object.keys(upsertError.keyPattern)[0] + '_1' : 
                      'unknown';
                    console.error('Database index issue detected. Error:', upsertError);
                    console.error(`This might be due to an old index: ${indexName}`);
                    console.error('Run the cleanup script to fix this:');
                    console.error('  cd backend');
                    console.error('  npm run cleanup-db');
                    console.error('Or manually in MongoDB:');
                    console.error(`  db.users.dropIndex("${indexName}")`);
                    console.error('  db.users.deleteMany({ phoneNumber: null })');
                    console.error('  db.users.updateMany({}, { $unset: { firebaseUid: "", mobileNumber: "" } })');
                    
                    // Try one more time with a different approach - find by any means
                    const allUsers = await User.find({}).limit(10);
                    console.error('Sample users in DB:', allUsers.map(u => ({ 
                      id: u._id, 
                      phoneNumber: u.phoneNumber,
                      hasMobileNumber: !!u.mobileNumber 
                    })));
                    
                    throw new Error('Database configuration issue detected. Please check server logs for cleanup instructions.');
                  }
                } else {
                  throw upsertError;
                }
              }
            }
          }
        } else {
          throw createError;
        }
      }
    } else {
      // User exists - update name if provided and not set
      if (name && typeof name === 'string' && name.trim() && !user.name) {
        user.name = name.trim();
        await user.save();
      }
    }

    const token = jwt.sign(
      {
        userId: user._id,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    // Determine if onboarding is required
    // Hackathon rule: run full verification/onboarding only for *new users during signup*.
    // Once a user account exists, logging in again should NOT re-trigger onboarding,
    // even if onboardingCompleted is still false.
    const requiresOnboarding = isNewUser;

    res.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      requiresOnboarding,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;
