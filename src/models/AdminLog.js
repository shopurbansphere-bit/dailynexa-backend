const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'generate_key',
      'revoke_key',
      'verify_success',
      'verify_fail',
      'admin_login',
      'admin_login_fail'
    ]
  },
  ip: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

adminLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
