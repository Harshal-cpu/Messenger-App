const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },

    // --- Group-only fields (Module 5) ---
    groupName: { type: String, trim: true, maxlength: 100 },
    groupImage: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    groupAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // --- Per-user chat preferences (Module 8) ---
    mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    theme: { type: String, default: 'default' },
  },
  { timestamps: true }
);

// A 1:1 chat is uniquely identified by its pair of participants
chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);
