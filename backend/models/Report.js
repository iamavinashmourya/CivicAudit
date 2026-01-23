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
    enum: ['Pending', 'Verified', 'Resolved'],
    default: 'Pending',
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

