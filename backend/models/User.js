const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: ''
  },
  role: { 
    type: String, 
    enum: ['citizen', 'admin'],
    default: 'citizen' 
  },
  location: {
    type: { 
      type: String, 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], 
      default: [0, 0] 
    }
  },
  // Onboarding fields
  profilePhoto: {
    type: String,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  age: {
    type: Number,
    default: null
  },
  wardName: {
    type: String,
    default: null
  },
  aadhaarNumber: {
    type: String,
    default: null,
    // Mask in toJSON to hide from responses
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index for location queries (for duplicate detection and jury selection)
userSchema.index({ location: '2dsphere' });

// Mask aadhaar number in JSON responses
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj.aadhaarNumber) {
    // Show only last 4 digits: XXXX XXXX 9012
    const masked = obj.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, 'XXXX XXXX $3');
    obj.aadhaarNumber = masked;
  }
  return obj;
};

// Update the updatedAt field before saving
userSchema.pre('save', function () {
  this.updatedAt = new Date();
  
  // Ensure phoneNumber is never null or undefined
  if (!this.phoneNumber || typeof this.phoneNumber !== 'string' || this.phoneNumber.trim() === '') {
    throw new Error('phoneNumber must be a non-empty string');
  }
  
  // Normalize phoneNumber
  this.phoneNumber = this.phoneNumber.trim();
});

module.exports = mongoose.model('User', userSchema);
