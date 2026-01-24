const Notification = require('../models/Notification');
const User = require('../models/User');
const Report = require('../models/Report');

/**
 * Send notifications to all users within 2km of a new report
 * @param {Object} report - The newly created report
 */
async function notifyNearbyUsers(report) {
  try {
    if (!report.location || !report.location.coordinates) {
      console.log('[Notifications] Report has no location, skipping notifications');
      return;
    }

    const [lng, lat] = report.location.coordinates;
    const reportId = report._id;
    const reportTitle = report.title || 'New Report';
    const reportCategory = report.category || 'Issue';

    console.log(`[Notifications] Finding users within 2km of report at [${lat}, ${lng}]`);

    // Find all users within 2km of the report location
    // Exclude the report creator
    const nearbyUsers = await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: 2000 // 2km in meters
        }
      },
      _id: { $ne: report.userId }, // Exclude report creator
      onboardingCompleted: true // Only notify users who completed onboarding
    }).select('_id').lean();

    console.log(`[Notifications] Found ${nearbyUsers.length} nearby users to notify`);

    if (nearbyUsers.length === 0) {
      return;
    }

    // Create notifications for all nearby users
    const notifications = nearbyUsers.map(user => ({
      userId: user._id,
      reportId: reportId,
      type: 'new_report',
      title: 'New Report in Your Area',
      message: `"${reportTitle}" - ${reportCategory} issue reported nearby. Please verify and upvote if needed.`,
      read: false
    }));

    // Bulk insert notifications
    await Notification.insertMany(notifications);
    console.log(`[Notifications] Sent ${notifications.length} notifications successfully`);

  } catch (error) {
    console.error('[Notifications] Error sending notifications:', error);
    // Don't throw - notification failure shouldn't break report creation
  }
}

/**
 * Send notification when a report is verified
 * @param {Object} report - The verified report
 */
async function notifyReportVerified(report) {
  try {
    const notification = new Notification({
      userId: report.userId,
      reportId: report._id,
      type: 'report_verified',
      title: 'Report Verified',
      message: `Your report "${report.title}" has been verified by authorities.`,
      read: false
    });

    await notification.save();
    console.log(`[Notifications] Sent verification notification to user ${report.userId}`);
  } catch (error) {
    console.error('[Notifications] Error sending verification notification:', error);
  }
}

/**
 * Send resolution verification requests to users within 500m
 * @param {Object} report - The report that needs resolution verification
 */
async function sendResolutionVerificationRequests(report) {
  try {
    if (!report.location || !report.location.coordinates) {
      console.log('[Notifications] Report has no location, skipping resolution verification requests');
      return;
    }

    const [lng, lat] = report.location.coordinates;
    const reportId = report._id;
    const reportTitle = report.title || 'Report';
    const reportCategory = report.category || 'Issue';

    console.log(`[Notifications] Finding users within 500m for resolution verification at [${lat}, ${lng}]`);

    // Find all users within 500m of the report location
    // Exclude the report creator
    const nearbyUsers = await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: 500 // 500m in meters
        }
      },
      _id: { $ne: report.userId }, // Exclude report creator
      onboardingCompleted: true // Only notify users who completed onboarding
    }).select('_id').lean();

    console.log(`[Notifications] Found ${nearbyUsers.length} nearby users for resolution verification`);

    if (nearbyUsers.length === 0) {
      console.log('[Notifications] No nearby users found for resolution verification');
      return;
    }

    // Randomly select up to 5 users (or all if less than 5)
    const selectedUsers = nearbyUsers
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, Math.min(5, nearbyUsers.length));

    console.log(`[Notifications] Selected ${selectedUsers.length} random users for resolution verification`);

    // Create notifications for selected users
    const notifications = selectedUsers.map(user => ({
      userId: user._id,
      reportId: reportId,
      type: 'resolution_verification',
      title: 'Verify Issue Resolution',
      message: `Admin marked "${reportTitle}" (${reportCategory}) as resolved. Please verify if the issue is actually fixed in your area.`,
      read: false,
      link: `/dashboard?reportId=${reportId}&action=verify-resolution`
    }));

    // Bulk insert notifications
    await Notification.insertMany(notifications);
    console.log(`[Notifications] Sent ${notifications.length} resolution verification requests successfully`);

  } catch (error) {
    console.error('[Notifications] Error sending resolution verification requests:', error);
    // Don't throw - notification failure shouldn't break the process
  }
}

module.exports = {
  notifyNearbyUsers,
  notifyReportVerified,
  sendResolutionVerificationRequests
};
