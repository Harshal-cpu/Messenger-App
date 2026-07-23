const mongoose = require('mongoose');

// Defined as their own schemas (rather than inline plain objects) so we can
// set `default: undefined` on the parent path below — this stops Mongoose
// from auto-creating an empty-but-truthy { url: null, ... } object on every
// plain text message, which was causing the frontend to always render the
// "media" branch instead of the message text.
const mediaSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'voice_note', 'gif'],
    },
    fileName: { type: String },
    fileSize: { type: Number },
    // Compact placeholder string (images only) decoded client-side into a
    // blurred preview shown while the full-resolution image loads.
    blurhash: { type: String },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    question: { type: String },
    options: [
      {
        text: String,
        votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: { type: String, trim: true, maxlength: 5000 },

    // --- Media (populated in Module 6) ---
    // default: undefined is required here (see comment above) — without it
    // Mongoose still auto-creates an empty subdocument for every message.
    media: { type: mediaSchema, default: undefined },

    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    edited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },

    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // "delete for me"
    deletedForEveryone: { type: Boolean, default: false }, // "delete for everyone"

    // --- Advanced features (Module 8) ---
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
    pinned: { type: Boolean, default: false },
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    scheduledFor: { type: Date, default: null },
    poll: { type: pollSchema, default: undefined },
  },
  { timestamps: true }
);

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ content: 'text' });

module.exports = mongoose.model('Message', messageSchema);
