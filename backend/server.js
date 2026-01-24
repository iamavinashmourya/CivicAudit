const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Handle preflight requests explicitly
// NOTE: Express 5 (path-to-regexp) does not accept '*' as a route pattern.
app.options(/.*/, cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civicaudit')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'CivicAudit Backend API is running' });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
// app.use('/api/admin', require('./routes/admin'));

// Auto-remove rejected reports after 30-60 minutes
const Report = require('./models/Report');

async function cleanupRejectedReports() {
  try {
    const now = new Date();
    // Remove reports that have been rejected for at least 30 minutes
    // Reports are removed between 30-60 minutes after rejection
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    // Find reports rejected at least 30 minutes ago
    const reportsToDelete = await Report.find({
      status: 'Rejected',
      rejectedAt: {
        $exists: true,
        $lte: thirtyMinutesAgo, // Rejected at least 30 minutes ago
      },
    });
    
    if (reportsToDelete.length > 0) {
      // Mark as deleted instead of actually deleting (for audit trail)
      const result = await Report.updateMany(
        {
          _id: { $in: reportsToDelete.map(r => r._id) },
        },
        {
          $set: { status: 'Deleted' },
        }
      );
      
      const deletedCount = result.modifiedCount;
      if (deletedCount > 0) {
        console.log(`🗑️ Auto-removed ${deletedCount} rejected report(s) (rejected ≥30 minutes ago)`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up rejected reports:', error);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRejectedReports, 5 * 60 * 1000); // 5 minutes
console.log('✅ Auto-cleanup job started: Will remove rejected reports after 30-60 minutes');

// Run cleanup once on startup
cleanupRejectedReports();

// Default to 5002 to avoid common conflicts (5000 is often used by other dev servers on Windows)
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
