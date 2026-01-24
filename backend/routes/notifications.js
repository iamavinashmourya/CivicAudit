const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');

// GET /api/notifications - Get all notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const notifications = await Notification.find({ userId })
      .populate('reportId', 'title category status imageUrl')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Format notifications for frontend
    const formattedNotifications = notifications.map(notif => ({
      id: notif._id.toString(),
      type: notif.type === 'new_report' ? 'info' : notif.type === 'report_verified' ? 'success' : 'alert',
      title: notif.title,
      message: notif.message,
      time: formatTimeAgo(notif.createdAt),
      read: notif.read,
      reportId: notif.reportId?._id?.toString(),
      link: notif.reportId ? `/dashboard?reportId=${notif.reportId._id}` : null
    }));

    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      notifications: formattedNotifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.read = true;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

// Helper function to format time ago
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return new Date(date).toLocaleDateString();
}

module.exports = router;
