const mongoose = require('mongoose');

const keySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true
  },
  date: {
    type: String, // YYYY-MM-DD in Asia/Kolkata
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active'
  },
  maxDevices: {
    type: Number,
    default: 1
  },
  usedDevices: {
    type: [String],
    default: []
  },
  revokedAt: {
    type: Date,
    default: null
  }
});

// Compound index for fast daily lookup
keySchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Key', keySchema);
