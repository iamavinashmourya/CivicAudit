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

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90',
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180',
      });
    }

    // Debug logging
    console.log(`[Nearby Reports] Query: lat=${latitude}, lng=${longitude}`);

    const queryPoint = {
      type: 'Point',
      coordinates: [longitude, latitude], // [lng, lat] - GeoJSON format
    };

    const reports = await Report.find({
      location: {
        $near: {
          $geometry: queryPoint,
          $maxDistance: 2000, // 2km radius in meters
        },
      },
    }).populate('userId', 'name phoneNumber').lean();

    console.log(`[Nearby Reports] Found ${reports.length} report(s) within 2km`);

    // Format response - ensure coordinates are properly formatted
    const formattedReports = reports.map(report => ({
      ...report,
      location: {
        type: report.location.type || 'Point',
        coordinates: report.location.coordinates, // Already [lng, lat]
      },
    }));

    return res.json({
      success: true,
      reports: formattedReports,
      query: {
        lat: latitude,
        lng: longitude,
        radius: '2km',
      },
      count: formattedReports.length,
    });
  } catch (error) {
    console.error('Nearby reports error:', error);
    
    // Check if it's a geospatial index error
    if (error.message && error.message.includes('index')) {
      return res.status(500).json({
        success: false,
        message: 'Geospatial index not found. Please ensure the location index is created.',
        error: error.message,
        hint: 'Run: db.reports.createIndex({ location: "2dsphere" })',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;

