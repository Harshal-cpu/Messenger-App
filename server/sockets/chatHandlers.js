const Chat = require('../models/Chat');
const Message = require('../models/Message');
const extractMentions = require('../utils/extractMentions');
const notify = require('../utils/notify');
const createRateLimiter = require('../utils/socketRateLimiter');
const onlineUsers = require('../utils/onlineUsers');
const { sendPushToUser } = require('../services/pushService');

// 20 messages per 10 seconds per user — generous for real usage, tight
// enough to stop a scripted flood. Typing events get a looser limit since
// they're low-impact but still worth bounding.
const messageLimiter = createRateLimiter({ max: 20, windowMs: 10_000 });
const typingLimiter = createRateLimiter({ max: 30, windowMs: 10_000 });

/**
 * Registers chat-related Socket.IO events on a connected socket.
 * Called from sockets/index.js inside the `connection` handler.
 */
function registerChatHandlers(io, socket) {
  // Client joins a chat room to receive real-time events for it
  socket.on('join', async (chatId) => {
    const chat = await Chat.findOne({ _id: chatId, participants: socket.userId });
    if (!chat) return; // silently ignore — not a participant
    socket.join(`chat:${chatId}`);

    // Mark messages as delivered to this user now that they're actively viewing
    await Message.updateMany(
      { chat: chatId, deliveredTo: { $ne: socket.userId } },
      { $addToSet: { deliveredTo: socket.userId } }
    );

    socket.to(`chat:${chatId}`).emit('delivered', {
      chatId,
      userId: socket.userId,
    });
  });

  socket.on('leave', (chatId) => {
    socket.leave(`chat:${chatId}`);
  });

  socket.on('typing', ({ chatId }) => {
    if (!chatId) return;
    if (!typingLimiter.check(socket.userId)) return;
    socket.to(`chat:${chatId}`).emit('typing', { chatId, userId: socket.userId });
  });

  socket.on('stopTyping', ({ chatId }) => {
    if (!chatId) return;
    socket.to(`chat:${chatId}`).emit('stopTyping', { chatId, userId: socket.userId });
  });

  /**
   * Real-time message send. This is the primary path clients use;
   * POST /api/v1/messages/:chatId (messageController.sendMessage) exists
   * as a REST fallback for the same operation.
   */
  socket.on('message', async (payload, callback) => {
    try {
      if (!messageLimiter.check(socket.userId)) {
        if (callback) callback({ error: 'You are sending messages too quickly. Please slow down.' });
        return;
      }

      const { chatId, content, replyTo } = payload;

      const chat = await Chat.findOne({ _id: chatId, participants: socket.userId }).populate(
        'participants',
        'name'
      );
      if (!chat) {
        if (callback) callback({ error: 'Chat not found or access denied.' });
        return;
      }
      if (!content?.trim()) {
        if (callback) callback({ error: 'Message content cannot be empty.' });
        return;
      }

      const mentions = extractMentions(content, chat.participants, socket.userId);

      const message = await Message.create({
        chat: chatId,
        sender: socket.userId,
        content: content.trim(),
        replyTo: replyTo || null,
        mentions,
        deliveredTo: [socket.userId],
        readBy: [socket.userId],
      });

      chat.lastMessage = message._id;
      await chat.save();

      const populated = await message.populate('sender', 'name avatar');

      // Emit to everyone in the chat room (including sender, for multi-device sync)
      io.to(`chat:${chatId}`).emit('message', populated);

      // Also emit to each participant's personal room in case they haven't
      // joined the chat room yet (e.g. sidebar should update unread count)
      chat.participants.forEach((p) => {
        const participantId = (p._id || p).toString();
        if (participantId !== socket.userId) {
          io.to(`user:${participantId}`).emit('message', populated);

          // Push notification for anyone not currently connected at all —
          // covers the "app is fully closed" case that Socket.IO can't reach.
          if (!onlineUsers.has(participantId)) {
            sendPushToUser(participantId, {
              title: chat.isGroup ? chat.groupName || 'Group chat' : socket.user.name,
              body: content.trim().slice(0, 120),
              url: '/app',
            }).catch(() => {});
          }
        }
      });

      // Fire mention notifications
      await Promise.all(
        mentions.map((userId) =>
          notify(io, {
            recipient: userId,
            sender: socket.userId,
            type: 'mention',
            message: `${socket.user.name} mentioned you in a message.`,
            relatedId: message._id,
          })
        )
      );

      if (callback) callback({ success: true, message: populated });
    } catch (err) {
      if (callback) callback({ error: 'Failed to send message.' });
    }
  });
}

module.exports = registerChatHandlers;
