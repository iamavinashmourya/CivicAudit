const mongoose = require('mongoose');
const Report = require('../models/Report');
const { sendResolutionVerificationRequests } = require('../utils/notifications');
require('dotenv').config();

async function sendNotificationsForPendingResolutions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civicaudit');
    console.log('✅ Connected to MongoDB');

    // Find all reports with "Resolution Pending" status
    const pendingReports = await Report.find({ status: 'Resolution Pending' })
      .populate('userId', 'name')
      .lean();

    console.log(`\n📋 Found ${pendingReports.length} reports with "Resolution Pending" status`);

    if (pendingReports.length === 0) {
      console.log('✅ No reports need notifications');
      await mongoose.connection.close();
      return;
    }

    // Check which ones already have notifications sent
    const Notification = require('../models/Notification');
    
    let sentCount = 0;
    let skippedCount = 0;

    for (const report of pendingReports) {
      try {
        // Check if notifications already exist for this report
        const existingNotifications = await Notification.find({
          reportId: report._id,
          type: 'resolution_verification'
        }).countDocuments();

        if (existingNotifications > 0) {
          console.log(`⏭️  Skipping report "${report.title}" (ID: ${report._id}) - notifications already sent`);
          skippedCount++;
          continue;
        }

        // Convert to Mongoose document for the notification function
        const reportDoc = await Report.findById(report._id);
        
        if (!reportDoc) {
          console.log(`❌ Report "${report.title}" not found`);
          continue;
        }

        // Send resolution verification requests
        console.log(`📤 Sending notifications for report: "${report.title}" (ID: ${report._id})`);
        await sendResolutionVerificationRequests(reportDoc);
        
        sentCount++;
        console.log(`✅ Notifications sent for report: "${report.title}"`);
      } catch (error) {
        console.error(`❌ Error processing report "${report.title}":`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Sent notifications for: ${sentCount} reports`);
    console.log(`   ⏭️  Skipped (already sent): ${skippedCount} reports`);
    console.log(`   📋 Total processed: ${pendingReports.length} reports`);

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
sendNotificationsForPendingResolutions();
