const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');

const CHECK_INTERVAL_MS = 30 * 1000; // check every 30 seconds

/**
 * Finds messages whose scheduledFor time has passed but haven't been
 * dispatched yet, emits them to their chat's participants, updates the
 * parent chat's lastMessage, and clears scheduledFor so subsequent reads
 * (getMessages, getMyChats) treat them as normal, already-sent messages.
 */
async function dispatchDueScheduledMessages(io) {
  const dueMessages = await Message.find({
    scheduledFor: { $lte: new Date(), $ne: null },
  }).populate('sender', 'name avatar');

  for (const message of dueMessages) {
    const chat = await Chat.findById(message.chat);
    if (!chat) continue;

    message.scheduledFor = null;
    await message.save();

    chat.lastMessage = message._id;
    await chat.save();

    if (io) {
      chat.participants.forEach((p) => io.to(`user:${p}`).emit('message', message));
    }
  }
}

/**
 * Starts the recurring dispatch check. Called once from server.js after
 * Socket.IO is initialized.
 */
function startScheduledMessageDispatcher(io) {
  setInterval(() => {
    dispatchDueScheduledMessages(io).catch((err) =>
      logger.error('Scheduled message dispatch failed', { message: err.message })
    );
  }, CHECK_INTERVAL_MS);
}

module.exports = startScheduledMessageDispatcher;
