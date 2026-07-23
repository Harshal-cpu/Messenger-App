const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: [
        'friend_request',
        'friend_request_accepted',
        'message',
        'mention',
        'group_invite',
      ],
      required: true,
    },
    message: { type: String, required: true },
    relatedId: {
      // Generic reference (friend request id, message id, group id, etc.)
      type: mongoose.Schema.Types.ObjectId,
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
