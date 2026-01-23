/**
 * Database Cleanup Script
 * 
 * This script cleans up old indexes and documents that might be causing
 * duplicate key constraint errors.
 * 
 * Run with: node scripts/cleanup-db.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function cleanupDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicaudit';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get the collection
    const collection = mongoose.connection.collection('users');

    // List all indexes
    console.log('\n=== Current Indexes ===');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}:`, index.key);
    });

    // Try to drop old indexes if they exist
    console.log('\n=== Dropping Old Indexes ===');
    
    // Drop mobileNumber_1 index
    try {
      await collection.dropIndex('mobileNumber_1');
      console.log('✓ Dropped mobileNumber_1 index');
    } catch (err) {
      if (err.code === 27 || err.message.includes('index not found')) {
        console.log('ℹ mobileNumber_1 index does not exist (already cleaned)');
      } else {
        console.log('⚠ Could not drop mobileNumber_1 index:', err.message);
      }
    }

    // Drop firebaseUid_1 index (from old Firebase setup)
    try {
      await collection.dropIndex('firebaseUid_1');
      console.log('✓ Dropped firebaseUid_1 index');
    } catch (err) {
      if (err.code === 27 || err.message.includes('index not found')) {
        console.log('ℹ firebaseUid_1 index does not exist (already cleaned)');
      } else {
        console.log('⚠ Could not drop firebaseUid_1 index:', err.message);
      }
    }

    // Clean up documents with null phoneNumber
    console.log('\n=== Cleaning Up Documents ===');
    const deleteResult = await User.deleteMany({
      $or: [
        { phoneNumber: null },
        { phoneNumber: { $exists: false } },
        { phoneNumber: '' }
      ]
    });
    console.log(`✓ Deleted ${deleteResult.deletedCount} documents with null/empty phoneNumber`);

    // Clean up documents with old mobileNumber field
    const deleteMobileResult = await User.deleteMany({
      mobileNumber: { $exists: true }
    });
    console.log(`✓ Deleted ${deleteMobileResult.deletedCount} documents with old mobileNumber field`);

    // Remove firebaseUid field from all documents (no longer needed)
    const updateFirebaseResult = await User.updateMany(
      { firebaseUid: { $exists: true } },
      { $unset: { firebaseUid: "" } }
    );
    console.log(`✓ Removed firebaseUid field from ${updateFirebaseResult.modifiedCount} documents`);
    
    // Remove mobileNumber field from all documents (no longer needed)
    const updateMobileResult = await User.updateMany(
      { mobileNumber: { $exists: true } },
      { $unset: { mobileNumber: "" } }
    );
    console.log(`✓ Removed mobileNumber field from ${updateMobileResult.modifiedCount} documents`);

    // Verify phoneNumber index exists
    console.log('\n=== Verifying phoneNumber Index ===');
    const phoneNumberIndex = indexes.find(idx => 
      idx.key && idx.key.phoneNumber !== undefined
    );
    if (phoneNumberIndex) {
      console.log('✓ phoneNumber index exists');
    } else {
      console.log('⚠ phoneNumber index not found - this is normal if using unique: true in schema');
    }

    // Show current document count
    const totalUsers = await User.countDocuments();
    console.log(`\n=== Summary ===`);
    console.log(`Total users in database: ${totalUsers}`);

    console.log('\n✅ Cleanup completed successfully!');
    console.log('You can now try verifying OTP again.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run cleanup
cleanupDatabase();
