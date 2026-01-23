/**
 * Script to update report priorities based on new upvote thresholds
 * 
 * New thresholds:
 * - 5+ upvotes → CRITICAL
 * - 3-4 upvotes → HIGH
 * - 2 upvotes → MEDIUM
 * - 0-1 upvotes → LOW
 */

const mongoose = require('mongoose');
const Report = require('../models/Report');
require('dotenv').config();

async function updateReportPriorities() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicaudit';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all reports
    const reports = await Report.find({});
    console.log(`📊 Found ${reports.length} reports to check`);

    let updated = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const report of reports) {
      const upvoteCount = report.upvotes?.length || 0;
      const currentPriority = report.aiAnalysis?.priority || 'LOW';
      
      let newPriority = currentPriority;
      
      // Apply new priority rules
      if (upvoteCount >= 5) {
        newPriority = 'CRITICAL';
      } else if (upvoteCount >= 3) {
        newPriority = 'HIGH';
      } else if (upvoteCount >= 2) {
        newPriority = 'MEDIUM';
      } else {
        newPriority = 'LOW';
      }

      // Only update if priority changed
      if (newPriority !== currentPriority || !report.aiAnalysis) {
        if (!report.aiAnalysis) {
          report.aiAnalysis = {};
        }
        
        report.aiAnalysis.priority = newPriority;
        report.aiAnalysis.isCritical = (newPriority === 'CRITICAL');
        
        await report.save();
        updated++;
        
        console.log(`✅ Updated report "${report.title}" (${upvoteCount} upvotes): ${currentPriority} → ${newPriority}`);
      }

      // Count by priority
      if (newPriority === 'CRITICAL') criticalCount++;
      else if (newPriority === 'HIGH') highCount++;
      else if (newPriority === 'MEDIUM') mediumCount++;
      else lowCount++;
    }

    console.log('\n📈 Summary:');
    console.log(`   Total reports: ${reports.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   CRITICAL: ${criticalCount}`);
    console.log(`   HIGH: ${highCount}`);
    console.log(`   MEDIUM: ${mediumCount}`);
    console.log(`   LOW: ${lowCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating report priorities:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
updateReportPriorities();
