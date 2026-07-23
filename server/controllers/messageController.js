const Chat = require('../models/Chat');
const Message = require('../models/Message');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const extractMentions = require('../utils/extractMentions');
const notify = require('../utils/notify');
const onlineUsers = require('../utils/onlineUsers');
const { sendPushToUser } = require('../services/pushService');

const SENDER_FIELDS = 'name avatar';

const assertParticipant = async (chatId, userId, next) => {
  const chat = await Chat.findOne({ _id: chatId, participants: userId });
  if (!chat) {
    throw new AppError('Chat not found or you are not a participant.', 404);
  }
  return chat;
};

// @desc    Get paginated message history for a chat (oldest-first within page,
//          pages requested newest-first for infinite-scroll-up UI)
// @route   GET /api/v1/messages/:chatId?page=1&limit=30
// @access  Private
exports.getMessages = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  await assertParticipant(chatId, req.user.id, next);

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const skip = (page - 1) * limit;

  const messages = await Message.find({
    chat: chatId,
    deletedFor: { $ne: req.user.id },
    $or: [{ scheduledFor: null }, { scheduledFor: { $lte: new Date() } }],
  })
    .populate('sender', SENDER_FIELDS)
    .populate({ path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'name' } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: { messages: messages.reverse() }, // chronological order for the client
  });
});

// @desc    Send a message via REST (the primary path is the Socket.IO
//          'message' event in sockets/chatHandlers.js — this exists as a
//          fallback/for clients without an active socket connection)
// @route   POST /api/v1/messages/:chatId
// @access  Private
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const { content, replyTo } = req.body;

  const chat = await assertParticipant(chatId, req.user.id, next);

  if (!content?.trim()) {
    return next(new AppError('Message content cannot be empty.', 400));
  }

  const populatedChat = await chat.populate('participants', 'name');
  const mentions = extractMentions(content, populatedChat.participants, req.user.id);

  const message = await Message.create({
    chat: chatId,
    sender: req.user.id,
    content: content.trim(),
    replyTo: replyTo || null,
    mentions,
    deliveredTo: [req.user.id],
    readBy: [req.user.id],
  });

  chat.lastMessage = message._id;
  await chat.save();

  const populated = await message.populate('sender', SENDER_FIELDS);

  const io = req.app.get('io');
  if (io) {
    chat.participants
      .filter((p) => p.toString() !== req.user.id)
      .forEach((participantId) => {
        io.to(`user:${participantId}`).emit('message', populated);

        if (!onlineUsers.has(participantId.toString())) {
          sendPushToUser(participantId, {
            title: chat.isGroup ? chat.groupName || 'Group chat' : req.user.name,
            body: content.trim().slice(0, 120),
            url: '/app',
          }).catch(() => {});
        }
      });
  }

  // Fire mention notifications (in addition to the message event above)
  await Promise.all(
    mentions.map((userId) =>
      notify(io, {
        recipient: userId,
        sender: req.user.id,
        type: 'mention',
        message: `${req.user.name} mentioned you in a message.`,
        relatedId: message._id,
      })
    )
  );

  res.status(201).json({ status: 'success', data: { message: populated } });
});

// @desc    Edit a message (sender only, text messages only)
// @route   PATCH /api/v1/messages/:messageId
// @access  Private
exports.editMessage = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  const message = await Message.findById(req.params.messageId);

  if (!message) return next(new AppError('Message not found.', 404));
  if (message.sender.toString() !== req.user.id) {
    return next(new AppError('You can only edit your own messages.', 403));
  }
  if (message.deletedForEveryone) {
    return next(new AppError('Cannot edit a deleted message.', 400));
  }

  message.content = content;
  message.edited = true;
  message.editedAt = new Date();
  await message.save();

  const io = req.app.get('io');
  const chat = await Chat.findById(message.chat);
  if (io && chat) {
    chat.participants.forEach((p) => io.to(`user:${p}`).emit('messageEdited', message));
  }

  res.status(200).json({ status: 'success', data: { message } });
});

// @desc    Delete a message — "for me" (default) or "for everyone" (sender only, within 1 hour)
// @route   DELETE /api/v1/messages/:messageId?forEveryone=true
// @access  Private
exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) return next(new AppError('Message not found.', 404));

  const forEveryone = req.query.forEveryone === 'true';

  if (forEveryone) {
    if (message.sender.toString() !== req.user.id) {
      return next(new AppError('You can only delete your own messages for everyone.', 403));
    }
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > ONE_HOUR) {
      return next(new AppError('Messages can only be deleted for everyone within 1 hour.', 400));
    }

    message.deletedForEveryone = true;
    message.content = null;
    message.media = undefined;
    await message.save();

    const io = req.app.get('io');
    const chat = await Chat.findById(message.chat);
    if (io && chat) {
      chat.participants.forEach((p) =>
        io.to(`user:${p}`).emit('messageDeleted', { messageId: message._id, forEveryone: true })
      );
    }
  } else {
    if (!message.deletedFor.includes(req.user.id)) {
      message.deletedFor.push(req.user.id);
      await message.save();
    }
  }

  res.status(200).json({ status: 'success', message: 'Message deleted.' });
});

// @desc    Mark all unread messages in a chat as read
// @route   PATCH /api/v1/messages/:chatId/read
// @access  Private
exports.markChatAsRead = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  await assertParticipant(chatId, req.user.id, next);

  const result = await Message.updateMany(
    { chat: chatId, readBy: { $ne: req.user.id } },
    { $addToSet: { readBy: req.user.id, deliveredTo: req.user.id } }
  );

  const io = req.app.get('io');
  const chat = await Chat.findById(chatId);
  if (io && chat) {
    chat.participants
      .filter((p) => p.toString() !== req.user.id)
      .forEach((p) =>
        io.to(`user:${p}`).emit('read', { chatId, readerId: req.user.id })
      );
  }

  res.status(200).json({ status: 'success', modifiedCount: result.modifiedCount });
});
