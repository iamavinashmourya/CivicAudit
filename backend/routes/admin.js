const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const adminAuth = require('../middleware/adminAuth');

// GET /api/admin/reports - Get all reports with filtering and sorting
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    
    // Build query - Show only Verified reports by default
    const query = {
      status: { $ne: 'Deleted' }
    };
    
    // Filter by status if provided
    if (status && status !== 'all') {
      // Support both "Resolved" and "Closed" statuses
      if (status === 'Resolved') {
        query.status = { $in: ['Resolved', 'Closed', 'Resolution Pending'] };
      } else {
        query.status = status;
      }
    } else {
      // Default: Only show Verified reports (not Pending, not Closed)
      query.status = 'Verified';
    }
    
    // Filter by priority if provided
    if (priority && priority !== 'all') {
      query['aiAnalysis.priority'] = priority.toUpperCase();
    }
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Priority order: CRITICAL > HIGH > MEDIUM > LOW
    const priorityOrder = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
    
    // Fetch reports
    const reports = await Report.find(query)
      .populate('userId', 'name phoneNumber')
      .sort([
        // First sort by priority (CRITICAL first)
        ['aiAnalysis.priority', 1],
        // Then by creation date (newest first)
        ['createdAt', -1]
      ])
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Get total count for pagination
    const total = await Report.countDocuments(query);
    
    // Format reports for admin dashboard
    const { reverseGeocode } = require('../utils/reverseGeocode');
    
    // Fetch location names for all reports in parallel
    const formattedReportsPromises = reports.map(async (report) => {
      const coordinates = report.location?.coordinates || [];
      const lng = coordinates[0];
      const lat = coordinates[1];
      
      // Build image URL - handle both absolute and relative paths
      const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';
      let imageUrl = null;
      
      if (report.imageUrl) {
        if (report.imageUrl.startsWith('http://') || report.imageUrl.startsWith('https://')) {
          // Already a full URL
          imageUrl = report.imageUrl;
        } else if (report.imageUrl.startsWith('/')) {
          // Absolute path from root
          imageUrl = `${API_BASE_URL}${report.imageUrl}`;
        } else {
          // Relative path - assume it's in /uploads
          imageUrl = `${API_BASE_URL}/uploads/${report.imageUrl}`;
        }
      }
      
      // Fetch location name if not already stored
      let locationName = report.locationName;
      if (!locationName || locationName === 'Unknown Location') {
        if (lat && lng) {
          locationName = await reverseGeocode(lat, lng);
        } else {
          locationName = 'Unknown Location';
        }
      }
      
      return {
        id: report._id.toString(),
        _id: report._id.toString(),
        reportId: `R-${report._id.toString().slice(-4)}`, // Last 4 chars of ID
        title: report.title || 'Untitled Report',
        description: report.description || '',
        category: report.category || 'Other',
        priority: report.aiAnalysis?.priority || 'LOW',
        isCritical: report.aiAnalysis?.isCritical || false,
        status: report.status || 'Pending',
        location: {
          lat,
          lng,
          coordinates: [lng, lat]
        },
        locationName,
        imageUrl,
        upvotes: Array.isArray(report.upvotes) ? report.upvotes.length : 0,
        downvotes: Array.isArray(report.downvotes) ? report.downvotes.length : 0,
        score: report.score || 0,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        userId: report.userId ? {
          id: report.userId._id,
          name: report.userId.name || 'Unknown User',
          phoneNumber: report.userId.phoneNumber
        } : null,
        aiAnalysis: report.aiAnalysis || {}
      };
    });
    
    const formattedReports = await Promise.all(formattedReportsPromises);
    
    // Sort by priority order (CRITICAL first, then HIGH, MEDIUM, LOW)
    formattedReports.sort((a, b) => {
      const priorityA = priorityOrder[a.priority] || 99;
      const priorityB = priorityOrder[b.priority] || 99;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // If same priority, sort by date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json({
      success: true,
      reports: formattedReports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Admin get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message
    });
  }
});

// GET /api/admin/dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats', adminAuth, async (req, res) => {
  try {
    // Total reports = Only Verified reports (matching what's shown in the dashboard)
    const total = await Report.countDocuments({ status: 'Verified' });
    const critical = await Report.countDocuments({ 
      'aiAnalysis.priority': 'CRITICAL',
      status: 'Verified'
    });
    // Completed Issues = Resolved + Closed reports
    const completed = await Report.countDocuments({ 
      status: { $in: ['Resolved', 'Closed'] }
    });
    const pending = await Report.countDocuments({ status: 'Pending' });
    const verified = await Report.countDocuments({ status: 'Verified' });
    const high = await Report.countDocuments({ 
      'aiAnalysis.priority': 'HIGH',
      status: 'Verified'
    });
    
    res.json({
      success: true,
      stats: {
        total, // Now shows only verified reports
        critical, // Critical verified reports
        high, // High priority verified reports
        resolved: completed, // Completed = Resolved + Closed
        completed, // Alias for resolved
        pending,
        verified
      }
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
});

// PUT /api/admin/reports/:id/status - Update report status
router.put('/reports/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['Pending', 'Verified', 'Started', 'In Process', 'Resolved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // If admin marks as "Resolved", send verification requests to nearby users
    if (status === 'Resolved') {
      // Set status to "Resolution Pending" (waiting for user verification)
      report.status = 'Resolution Pending';
      report.resolvedAt = new Date();
      
      // Initialize resolution verification
      report.resolutionVerification = {
        requestedAt: new Date(),
        requestedBy: req.user._id,
        approvals: [],
        rejections: [],
        requiredApprovals: 2,
        closedAt: null
      };
      
      await report.save();
      
      // Send verification requests to nearby users (500m)
      const { sendResolutionVerificationRequests } = require('../utils/notifications');
      await sendResolutionVerificationRequests(report).catch(err => {
        console.error('[Admin] Error sending resolution verification requests:', err);
      });
      
      return res.json({
        success: true,
        message: 'Resolution verification requests sent to nearby users. Report will be closed after 2 approvals.',
        report: {
          id: report._id,
          status: report.status
        }
      });
    }
    
    // For other statuses, update normally
    report.status = status;
    if (status === 'Resolved') {
      report.resolvedAt = new Date();
    }
    await report.save();
    
    res.json({
      success: true,
      message: 'Report status updated successfully',
      report: {
        id: report._id,
        status: report.status
      }
    });
  } catch (error) {
    console.error('Admin update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report status',
      error: error.message
    });
  }
});

module.exports = router;
