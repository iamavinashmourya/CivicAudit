const express = require('express');
const router = express.Router();

const { uploadReportImage } = require('../middleware/upload');
const auth = require('../middleware/auth');
const Report = require('../models/Report');

// POST /api/reports - Create a new report
router.post('/', auth, (req, res, next) => {
  // First run upload middleware to handle the file
  uploadReportImage(req, res, async (err) => {
    if (err) {
      console.error('Report image upload error:', err);
      
      // Provide helpful error message for field name mismatch
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: `Unexpected field name: "${err.field}". Please use field name "image" (lowercase) for the file upload.`,
        });
      }
      
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to upload image',
      });
    }

    try {
      const { title, category, lat, lng } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title is required',
        });
      }

      if (!category || !category.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category is required',
        });
      }

      if (lat === undefined || lng === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid latitude or longitude',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Report image is required',
        });
      }

      // Build image URL relative to /uploads/reports
      const imageUrl = `/uploads/reports/${req.file.filename}`;

      const report = new Report({
        userId: req.user._id, // Use _id from User document attached by auth middleware
        title: title.trim(),
        category: category.trim(),
        imageUrl,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude], // [lng, lat]
        },
        status: 'Pending',
      });

      await report.save();

      return res.status(201).json({
        success: true,
        report,
      });
    } catch (error) {
      console.error('Create report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  });
});

// GET /api/reports/nearby?lat=..&lng=..
router.get('/nearby', auth, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude',
      });
    }

    const reports = await Report.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude], // [lng, lat]
          },
          $maxDistance: 2000, // 2km radius
        },
      },
    }).populate('userId', 'name');

    return res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error('Nearby reports error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;

