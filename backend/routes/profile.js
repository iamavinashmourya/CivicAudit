const express = require('express');
const path = require('path');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { uploadProfilePhoto } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(auth);

// POST /api/profile/upload-photo
router.post('/upload-photo', uploadProfilePhoto, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image.'
      });
    }

    // Generate file URL (relative path for now, can be absolute URL in production)
    const fileUrl = `/uploads/profile-photos/${req.file.filename}`;

    // Update user profile photo
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    user.profilePhoto = fileUrl;
    await user.save();

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      profilePhoto: fileUrl
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
      error: error.message
    });
  }
});

// PUT /api/profile/identity
router.put('/identity', async (req, res) => {
  try {
    const { name, gender, age, dateOfBirth } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters.'
      });
    }

    if (!gender || !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Gender is required and must be one of: male, female, other.'
      });
    }

    if (!dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth is required.'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Update user identity
    user.name = name.trim();
    user.gender = gender;

    // Always use dateOfBirth to calculate age
    user.dateOfBirth = new Date(dateOfBirth);
    // Calculate age from DOB
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    user.age = calculatedAge;

    await user.save();

    res.json({
      success: true,
      message: 'Identity updated successfully',
      user: {
        id: user._id,
        name: user.name,
        gender: user.gender,
        age: user.age,
        dateOfBirth: user.dateOfBirth
      }
    });
  } catch (error) {
    console.error('Update identity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update identity',
      error: error.message
    });
  }
});

// PUT /api/profile/location
router.put('/location', async (req, res) => {
  try {
    const { coordinates, wardName } = req.body;

    // Validation
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid coordinates array [lng, lat] is required.'
      });
    }

    const [lng, lat] = coordinates;
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Coordinates must be numbers.'
      });
    }

    // Validate coordinate ranges
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate values.'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Update user location
    user.location = {
      type: 'Point',
      coordinates: [lng, lat]
    };

    if (wardName && typeof wardName === 'string' && wardName.trim()) {
      user.wardName = wardName.trim();
    }

    await user.save();

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        coordinates: user.location.coordinates,
        wardName: user.wardName
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
});

// POST /api/profile/verify-kyc
router.post('/verify-kyc', async (req, res) => {
  try {
    const { aadhaarNumber, otp } = req.body;

    // Validation
    if (!aadhaarNumber || typeof aadhaarNumber !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number is required.'
      });
    }

    // Remove spaces and validate 12 digits
    const cleanedAadhaar = aadhaarNumber.replace(/\s/g, '');
    if (!/^\d{12}$/.test(cleanedAadhaar)) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number must be exactly 12 digits.'
      });
    }

    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required and must be 6 digits.'
      });
    }

    // Mock verification - accept any 6-digit OTP
    // In real implementation, this would verify with Aadhaar API

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Update user KYC status
    user.aadhaarNumber = cleanedAadhaar;
    user.isVerified = true;
    user.onboardingCompleted = true;
    await user.save();

    res.json({
      success: true,
      message: 'KYC verification successful. You are now a verified citizen!',
      user: {
        id: user._id,
        isVerified: user.isVerified,
        onboardingCompleted: user.onboardingCompleted
      }
    });
  } catch (error) {
    console.error('KYC verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify KYC',
      error: error.message
    });
  }
});

// GET /api/profile - Get full user profile
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name || '',
        role: user.role || 'citizen',
        profilePhoto: user.profilePhoto || null,
        gender: user.gender || null,
        age: user.age || null,
        dateOfBirth: user.dateOfBirth || null,
        aadhaarNumber: user.aadhaarNumber || null,
        wardName: user.wardName || null,
        location: user.location || null,
        isVerified: user.isVerified || false,
        onboardingCompleted: user.onboardingCompleted || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
});

// GET /api/profile/status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      onboardingCompleted: user.onboardingCompleted,
      profile: {
        hasPhoto: !!user.profilePhoto,
        hasIdentity: !!(user.name && user.gender && (user.age || user.dateOfBirth)),
        hasLocation: !!(user.location && user.location.coordinates[0] !== 0 && user.location.coordinates[1] !== 0),
        isVerified: user.isVerified,
        location: user.location ? {
          coordinates: user.location.coordinates, // [lng, lat]
          wardName: user.wardName
        } : null
      }
    });
  } catch (error) {
    console.error('Get profile status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile status',
      error: error.message
    });
  }
});

module.exports = router;
