const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const { uploadReportImage } = require('../middleware/upload');
const auth = require('../middleware/auth');
const Report = require('../models/Report');
const { notifyNearbyUsers } = require('../utils/notifications');

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
      const { title, description, category, lat, lng } = req.body;

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

      // Check for duplicate report within 500m with SAME CATEGORY
      // Different categories (e.g., "Road" vs "Electricity") are NOT duplicates
      const queryPoint = {
        type: 'Point',
        coordinates: [longitude, latitude], // [lng, lat] - GeoJSON format
      };

      const userId = req.user._id || req.userId;
      const reportCategory = category.trim().toLowerCase();
      console.log(`[Duplicate Check] Checking for existing reports within 500m with category: "${reportCategory}"`);
      console.log(`[Duplicate Check] Location: [${longitude}, ${latitude}]`);
      console.log(`[Duplicate Check] Current user: ${userId}`);

      // Find ALL active reports (by any user) - only Pending and Verified
      // Exclude Resolved (already fixed), Deleted and Rejected reports
      // Resolved reports don't block new reports (issue might have returned)
      // Filter by category first to avoid false duplicates
      const allReports = await Report.find({
        status: { $in: ['Pending', 'Verified'] }, // Only active reports (not resolved)
        category: { $regex: new RegExp(`^${reportCategory}$`, 'i') }, // Case-insensitive category match
      }).lean();

      console.log(`[Duplicate Check] Found ${allReports.length} active reports with category "${reportCategory}" (Pending or Verified)`);

      // Calculate distance for each report and find if any are within 500m
      let existingReport = null;
      let closestDistance = Infinity;
      
      for (const report of allReports) {
        if (!report.location || !report.location.coordinates) continue;
        
        const [reportLng, reportLat] = report.location.coordinates;
        
        // Calculate distance using Haversine formula
        const R = 6371000; // Earth's radius in meters
        const dLat = (latitude - reportLat) * Math.PI / 180;
        const dLng = (longitude - reportLng) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(reportLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in meters

        if (distance <= 500 && distance < closestDistance) {
          existingReport = report;
          closestDistance = distance;
          console.log(`[Duplicate Check] Found duplicate report within 500m: "${report.title}" (category: ${report.category}) by user ${report.userId} (${Math.round(distance)}m away)`);
        }
      }

      console.log(`[Duplicate Check] Final result:`, existingReport ? `Found duplicate: "${existingReport.title}" (${Math.round(closestDistance)}m)` : 'No duplicate found - can create new report');

      if (existingReport) {
        // Check if user has already voted on this report
        const userIdStr = userId.toString();
        const hasUpvoted = (existingReport.upvotes || []).some((id) => id.toString() === userIdStr);
        const hasDownvoted = (existingReport.downvotes || []).some((id) => id.toString() === userIdStr);
        const hasVoted = hasUpvoted || hasDownvoted;

        // Delete the uploaded file since we're not creating a new report
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }

        return res.status(200).json({
          success: true,
          isDuplicate: true,
          message: 'A report already exists at this location. Showing existing report.',
          report: existingReport,
          canVote: !hasVoted, // Can vote if not already voted
          hasUpvoted,
          hasDownvoted,
        });
      }

      // Build image URL relative to /uploads/reports
      const imageUrl = `/uploads/reports/${req.file.filename}`;

      // 1. Prepare text for AI analysis
      // Combine title and description for better analysis (both may contain important keywords)
      const textToAnalyze = [title, description].filter(Boolean).join('. ').trim();
      
      // Debug logging
      console.log(`[AI Integration] Text to analyze: "${textToAnalyze.substring(0, 100)}${textToAnalyze.length > 100 ? '...' : ''}"`);
      console.log(`[AI Integration] Has description: ${!!description}, Has title: ${!!title}`);

      // 2. Default AI result (fallback if Python service is down)
      let aiData = {
        priority: 'LOW',
        is_critical: false,
        suggested_category: category,
        scores: { sentiment: 0 },
        keywords_detected: {},
      };

      // 3. Call Python AI Service with Image + Text (Gatekeeper)
      if (textToAnalyze.length > 2 && req.file) {
        try {
          const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
          console.log(`[AI Integration] Calling AI service at ${aiServiceUrl}/analyze with image`);
          
          // Prepare FormData with image and text
          const form = new FormData();
          form.append('text', textToAnalyze);
          form.append('image', fs.createReadStream(req.file.path));

          const aiResponse = await axios.post(
            `${aiServiceUrl}/analyze`,
            form,
            {
              headers: form.getHeaders(),
              timeout: 10000 // 10 seconds for image processing
            }
          );

          console.log(`[AI Integration] AI Response status: ${aiResponse.data.status}`);
          console.log(`[AI Integration] AI Response data:`, JSON.stringify(aiResponse.data, null, 2));

          if (aiResponse.data.status === 'success') {
            aiData = aiResponse.data.analysis;
            console.log(`🤖 AI Service Success: ${aiData.priority} (is_critical: ${aiData.is_critical})`);
          } else {
            console.warn(`[AI Integration] AI service returned non-success status: ${aiResponse.data.status}`);
          }
        } catch (aiError) {
          // HANDLE REJECTION (The "Cat Photo" Scenario)
          if (aiError.response && aiError.response.status === 400) {
            const rejectionData = aiError.response.data;
            console.log(`⛔ AI BLOCKED REPORT: ${rejectionData.reason || 'Image mismatch'}`);
            return res.status(400).json({
              success: false,
              message: rejectionData.message || 'Report Rejected by AI',
              reason: rejectionData.reason || 'Image does not match description',
            });
          }
          
          // Other errors - continue with defaults (graceful degradation)
          console.error('⚠️ AI Service Error (Continuing anyway):', aiError.message);
          if (aiError.response) {
            console.error(`[AI Integration] AI Error Response Status: ${aiError.response.status}`);
            console.error(`[AI Integration] AI Error Response Data:`, aiError.response.data);
          }
          if (aiError.code) {
            console.error(`[AI Integration] Error Code: ${aiError.code}`);
          }
          if (aiError.request) {
            console.error(`[AI Integration] Request made but no response received`);
          }
        }
      } else {
        if (!req.file) {
          console.log(`[AI Integration] No image file, skipping AI analysis`);
        } else {
          console.log(`[AI Integration] Text too short (${textToAnalyze.length} chars), skipping AI analysis`);
        }
      }

      // 4. Flatten keywords from category structure
      // AI returns: { "disaster": ["fire", "smoke"], "electricity": ["sparking"] }
      // We need: ["fire", "smoke", "sparking"]
      const flattenedKeywords = Object.keys(aiData.keywords_detected || {}).flatMap(
        (category) => aiData.keywords_detected[category] || []
      );

      // 5. Determine initial status based on AI analysis
      // If AI says CRITICAL (Real Fire/Flood), Auto-Verify.
      // Otherwise, mark Pending.
      let initialStatus = 'Pending';
      if (aiData.priority === 'CRITICAL') {
        initialStatus = 'Verified';
        console.log(`✅ Auto-verifying CRITICAL report`);
      }

      // 6. Use AI-suggested category if provided (and not 'Other')
      const finalCategory = (aiData.suggested_category && aiData.suggested_category !== 'Other') 
        ? aiData.suggested_category 
        : category.trim();

      // 7. Create Report with AI Data
      const report = new Report({
        userId: req.user._id, // Use _id from User document attached by auth middleware
        title: title.trim(),
        description: description ? description.trim() : '',
        category: finalCategory,
        imageUrl,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude], // [lng, lat]
        },
        status: initialStatus, // Smart status based on AI analysis
        aiAnalysis: {
          priority: aiData.priority,
          isCritical: aiData.is_critical,
          sentimentScore: aiData.scores?.sentiment || 0,
          keywords: flattenedKeywords,
          processedAt: new Date(),
        },
      });

      await report.save();

      // Send notifications to nearby users (async, don't wait)
      notifyNearbyUsers(report).catch(err => {
        console.error('[Report Creation] Notification error (non-blocking):', err);
      });

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

// PUT /api/reports/:id/vote
// Body: { "type": "up" } OR { "type": "down" }
// Toggle behavior:
// - If user already voted the same way, clicking again removes their vote
// - If user voted opposite, it switches the vote
router.put('/:id/vote', auth, async (req, res) => {
  try {
    const { type } = req.body; // 'up' | 'down'
    if (type !== 'up' && type !== 'down') {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type. Must be "up" or "down".',
      });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();
    
    // Prevent downvoting own reports (but allow upvoting)
    if (type === 'down' && report.userId.toString() === userIdStr) {
      return res.status(403).json({
        success: false,
        message: 'You cannot downvote your own report.',
      });
    }

    // Determine current vote state BEFORE mutating arrays (for true toggle)
    const hadUpvote = (report.upvotes || []).some((id) => id.toString() === userIdStr);
    const hadDownvote = (report.downvotes || []).some((id) => id.toString() === userIdStr);

    // Always remove any existing vote first
    report.upvotes = (report.upvotes || []).filter((id) => id.toString() !== userIdStr);
    report.downvotes = (report.downvotes || []).filter((id) => id.toString() !== userIdStr);

    // Apply new vote unless it's a toggle-off of the same vote
    const isTogglingOff =
      (type === 'up' && hadUpvote) ||
      (type === 'down' && hadDownvote);

    if (!isTogglingOff) {
      if (type === 'up') report.upvotes.push(userId);
      if (type === 'down') report.downvotes.push(userId);
    }

    // Recompute score
    report.score = (report.upvotes?.length || 0) - (report.downvotes?.length || 0);

    // SMART STATUS UPDATE (Civic Jury Correction Logic)
    
    // CASE A: Community Trusts it (Score >= 3)
    // Set status to Verified if currently Pending
    if (report.score >= 3) {
      if (report.status === 'Pending') {
        report.status = 'Verified';
        console.log(`✅ Community verified report (score: ${report.score})`);
      } else if (report.status === 'Rejected') {
        // Can override rejection with strong community support
        report.status = 'Verified';
        console.log(`✅ Community overrode rejection (score: ${report.score})`);
      }
    } 
    // CASE B: Community Rejects it (Score <= -3)
    // Mark as Rejected (Spam/Fake) - even if AI verified it
    else if (report.score <= -3) {
      // Only set rejectedAt if status is changing to Rejected (not already rejected)
      if (report.status !== 'Rejected') {
        report.rejectedAt = new Date();
        console.log(`⛔ Community rejected report (score: ${report.score}) - will be auto-removed after 30-60 minutes`);
      }
      report.status = 'Rejected';
    }
    // If status changes away from Rejected, clear rejectedAt
    else if (report.status === 'Rejected' && report.score > -3) {
      report.rejectedAt = null;
    }
    // CASE C: Revoke Verification (Score < 0 on Verified report)
    // If it WAS Verified (by AI), but score drops below 0, remove the verified badge
    else if (report.status === 'Verified' && report.score < 0) {
      report.status = 'Pending';
      console.log(`⚠️ Verification revoked by community (score: ${report.score})`);
    }

    // PRIORITY UPDATE BASED ON COMMUNITY SUPPORT (Civic Jury Priority Boost)
    // More upvotes = Higher priority (community validation)
    const upvoteCount = report.upvotes?.length || 0;
    const currentPriority = report.aiAnalysis?.priority || 'LOW';
    
    // Priority escalation based on upvotes:
    // - 5+ upvotes → CRITICAL (high community trust)
    // - 3-4 upvotes → HIGH (strong community support)
    // - 2 upvotes → MEDIUM (moderate community support)
    // - 0-1 upvotes → Keep current or LOW (minimal support)
    let newPriority = currentPriority;
    
    if (upvoteCount >= 5) {
      newPriority = 'CRITICAL';
      if (currentPriority !== 'CRITICAL') {
        console.log(`🚨 Priority escalated to CRITICAL (${upvoteCount} upvotes)`);
      }
    } else if (upvoteCount >= 3) {
      newPriority = 'HIGH';
      if (currentPriority === 'LOW' || currentPriority === 'MEDIUM') {
        console.log(`⬆️ Priority escalated to HIGH (${upvoteCount} upvotes)`);
      }
    } else if (upvoteCount >= 2) {
      newPriority = 'MEDIUM';
      if (currentPriority === 'LOW') {
        console.log(`⬆️ Priority escalated to MEDIUM (${upvoteCount} upvotes)`);
      }
    } else if (upvoteCount < 2 && currentPriority === 'CRITICAL') {
      // If CRITICAL but low support, don't downgrade (might be AI-detected critical)
      // Only downgrade if score is negative
      if (report.score < 0) {
        newPriority = 'HIGH';
        console.log(`⬇️ Priority downgraded from CRITICAL to HIGH (low community support)`);
      }
    }
    
    // Update priority in aiAnalysis
    if (!report.aiAnalysis) {
      report.aiAnalysis = {};
    }
    report.aiAnalysis.priority = newPriority;
    
    // Update isCritical flag based on priority
    report.aiAnalysis.isCritical = (newPriority === 'CRITICAL');

    await report.save();

    // Populate userId for response
    await report.populate('userId', 'name phoneNumber');

    return res.json({
      success: true,
      report: {
        _id: report._id,
        id: report._id,
        upvotes: report.upvotes || [],
        downvotes: report.downvotes || [],
        score: report.score,
        status: report.status,
      },
      score: report.score,
      status: report.status,
    });
  } catch (error) {
    console.error('Vote report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
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

    const userId = req.user._id;
    
    // Include user's own reports only if they are Verified
    // Include other users' reports (Pending, Verified, Resolved) but exclude Rejected and Deleted
    const reports = await Report.find({
      location: {
        $near: {
          $geometry: queryPoint,
          $maxDistance: 2000, // 2km radius in meters
        },
      },
      $or: [
        // User's own reports: only if Verified
        { userId: userId, status: 'Verified' },
        // Other users' reports: Pending, Verified, or Resolved (but not Rejected or Deleted)
        { 
          userId: { $ne: userId },
          status: { $in: ['Pending', 'Verified', 'Resolved'] }
        }
      ],
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

// GET /api/reports/me - Fetch current user's reports (newest first)
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const reports = await Report.find({ 
      userId,
      status: { $ne: 'Deleted' }, // Exclude deleted reports
    })
      .sort({ createdAt: -1 })
      .populate('userId', 'name phoneNumber')
      .lean();

    return res.json({
      success: true,
      reports,
      count: reports.length,
    });
  } catch (error) {
    console.error('My reports error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

// GET /api/reports/:id - Fetch a single report by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const reportId = req.params.id;

    const report = await Report.findById(reportId)
      .populate('userId', 'name phoneNumber')
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    return res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Get report error:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID',
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

