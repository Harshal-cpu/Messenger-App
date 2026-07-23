const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // We store a hash of the refresh token, never the token itself — same
    // principle as password storage. This lets us look up "is this refresh
    // token still valid" and "list my sessions" without holding a secret
    // that could be misused if the database were ever exposed.
    refreshTokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String, default: 'Unknown device' },
    ip: { type: String, default: null },
    lastUsedAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, revoked: 1 });

module.exports = mongoose.model('Session', sessionSchema);
