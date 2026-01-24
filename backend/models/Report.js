const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  location: {
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified', 'Resolved', 'Resolution Pending', 'Closed', 'Rejected', 'Deleted'],
    default: 'Pending',
  },
  rejectedAt: {
    type: Date,
    default: null,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  // Resolution verification fields
  resolutionVerification: {
    requestedAt: {
      type: Date,
      default: null,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvals: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    rejections: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      rejectedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    requiredApprovals: {
      type: Number,
      default: 2, // Need 2 approvals to close
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  // AI Analysis fields
  aiAnalysis: {
    priority: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'LOW',
    },
    isCritical: {
      type: Boolean,
      default: false,
    },
    verificationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isDangerous: {
      type: Boolean,
      default: false,
    },
    dangerType: {
      type: String,
      enum: ['fire', 'electrical', 'flood', 'structural', null],
      default: null,
    },
    sentimentScore: {
      type: Number,
      default: 0,
    },
    keywords: {
      type: [String],
      default: [],
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  // Civic Jury fields
  // Track who voted to prevent duplicate voting and enable toggling
  upvotes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
  downvotes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
  // Computed score: upvotes.length - downvotes.length
  score: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Geospatial index for map / nearby queries
reportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', reportSchema);

