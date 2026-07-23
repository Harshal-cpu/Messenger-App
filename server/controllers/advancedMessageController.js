const Message = require('../models/Message');
const Chat = require('../models/Chat');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const emitToChat = async (io, chatId, event, payload) => {
  if (!io) return;
  const chat = await Chat.findById(chatId);
  if (!chat) return;
  chat.participants.forEach((p) => io.to(`user:${p}`).emit(event, payload));
};

// @desc    Search messages within a specific chat
// @route   GET /api/v1/messages/:chatId/search?q=hello
// @access  Private
exports.searchMessagesInChat = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const { q } = req.query;

  if (!q?.trim()) return next(new AppError('A search query "q" is required.', 400));

  const chat = await Chat.findOne({ _id: chatId, participants: req.user.id });
  if (!chat) return next(new AppError('Chat not found or you are not a participant.', 404));

  const messages = await Message.find(
    { chat: chatId, $text: { $search: q }, deletedFor: { $ne: req.user.id } },
    { score: { $meta: 'textScore' } }
  )
    .populate('sender', 'name avatar')
    .sort({ score: { $meta: 'textScore' } })
    .limit(50);

  res.status(200).json({ status: 'success', results: messages.length, data: { messages } });
});

// @desc    Search messages across every chat the current user belongs to
// @route   GET /api/v1/messages/search/all?q=hello
// @access  Private
exports.searchAllMessages = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  if (!q?.trim()) return next(new AppError('A search query "q" is required.', 400));

  const myChats = await Chat.find({ participants: req.user.id }).select('_id');
  const chatIds = myChats.map((c) => c._id);

  const messages = await Message.find(
    { chat: { $in: chatIds }, $text: { $search: q }, deletedFor: { $ne: req.user.id } },
    { score: { $meta: 'textScore' } }
  )
    .populate('sender', 'name avatar')
    .populate('chat', 'isGroup groupName participants')
    .sort({ score: { $meta: 'textScore' } })
    .limit(50);

  res.status(200).json({ status: 'success', results: messages.length, data: { messages } });
});
// @route   PATCH /api/v1/messages/message/:messageId/react
// @body    { emoji: "👍" }
// @access  Private
exports.reactToMessage = catchAsync(async (req, res, next) => {
  const { emoji } = req.body;
  if (!emoji) return next(new AppError('An emoji is required.', 400));

  const message = await Message.findById(req.params.messageId);
  if (!message) return next(new AppError('Message not found.', 404));

  message.reactions = message.reactions.filter(
    (r) => r.user.toString() !== req.user.id
  );
  message.reactions.push({ user: req.user.id, emoji });
  await message.save();

  await emitToChat(req.app.get('io'), message.chat, 'messageReaction', {
    messageId: message._id,
    reactions: message.reactions,
  });

  res.status(200).json({ status: 'success', data: { reactions: message.reactions } });
});

// @desc    Remove your reaction from a message
// @route   DELETE /api/v1/messages/message/:messageId/react
// @access  Private
exports.removeReaction = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) return next(new AppError('Message not found.', 404));

  message.reactions = message.reactions.filter(
    (r) => r.user.toString() !== req.user.id
  );
  await message.save();

  await emitToChat(req.app.get('io'), message.chat, 'messageReaction', {
    messageId: message._id,
    reactions: message.reactions,
  });

  res.status(200).json({ status: 'success', data: { reactions: message.reactions } });
});

// @desc    Pin or unpin a message within its chat
// @route   PATCH /api/v1/messages/message/:messageId/pin
// @access  Private
exports.togglePinMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) return next(new AppError('Message not found.', 404));

  message.pinned = !message.pinned;
  await message.save();

  await emitToChat(req.app.get('io'), message.chat, 'messagePinned', {
    messageId: message._id,
    pinned: message.pinned,
  });

  res.status(200).json({ status: 'success', data: { pinned: message.pinned } });
});

// @desc    Star or unstar a message (personal bookmark, not visible to others)
// @route   PATCH /api/v1/messages/message/:messageId/star
// @access  Private
exports.toggleStarMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) return next(new AppError('Message not found.', 404));

  const alreadyStarred = message.starredBy.some((u) => u.toString() === req.user.id);
  if (alreadyStarred) {
    message.starredBy = message.starredBy.filter((u) => u.toString() !== req.user.id);
  } else {
    message.starredBy.push(req.user.id);
  }
  await message.save();

  res.status(200).json({ status: 'success', starred: !alreadyStarred });
});

// @desc    Get all pinned messages for a chat
// @route   GET /api/v1/messages/:chatId/pinned
// @access  Private
exports.getPinnedMessages = catchAsync(async (req, res, next) => {
  const messages = await Message.find({ chat: req.params.chatId, pinned: true })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 });

  res.status(200).json({ status: 'success', results: messages.length, data: { messages } });
});

// @desc    Get all messages the current user has starred, across all chats
// @route   GET /api/v1/messages/starred
// @access  Private
exports.getStarredMessages = catchAsync(async (req, res, next) => {
  const messages = await Message.find({ starredBy: req.user.id })
    .populate('sender', 'name avatar')
    .populate('chat', 'isGroup groupName participants')
    .sort({ createdAt: -1 });

  res.status(200).json({ status: 'success', results: messages.length, data: { messages } });
});

// @desc    Search messages within a specific chat (uses MongoDB text index)
// @route   GET /api/v1/messages/:chatId/search?q=hello
// @access  Private
exports.searchMessagesInChat = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const { q } = req.query;

  if (!q?.trim()) return next(new AppError('A search query (q) is required.', 400));

  const chat = await Chat.findOne({ _id: chatId, participants: req.user.id });
  if (!chat) return next(new AppError('Chat not found or you are not a participant.', 404));

  const messages = await Message.find(
    { chat: chatId, $text: { $search: q }, deletedFor: { $ne: req.user.id } },
    { score: { $meta: 'textScore' } }
  )
    .populate('sender', 'name avatar')
    .sort({ score: { $meta: 'textScore' } })
    .limit(50);

  res.status(200).json({ status: 'success', results: messages.length, data: { messages } });
});

// @desc    Search messages across all of the current user's chats
// @route   GET /api/v1/messages/search/all?q=hello
// @access  Private
exports.searchAllMessages = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  if (!q?.trim()) return next(new AppError('A search query (q) is required.', 400));

  const myChats = await Chat.find({ participants: req.user.id }).select('_id');
  const chatIds = myChats.map((c) => c._id);

  const messages = await Message.find(
    { chat: { $in: chatIds }, $text: { $search: q }, deletedFor: { $ne: req.user.id } },
    { score: { $meta: 'textScore' } }
  )
    .populate('sender', 'name avatar')
    .populate('chat', 'isGroup groupName participants')
    .sort({ score: { $meta: 'textScore' } })
    .limit(50);

  res.status(200).json({ status: 'success', results: messages.length, data: { messages } });
});
// @route   POST /api/v1/messages/:chatId/schedule
// @body    { content, scheduledFor }
// @access  Private
exports.scheduleMessage = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const { content, scheduledFor } = req.body;

  const chat = await Chat.findOne({ _id: chatId, participants: req.user.id });
  if (!chat) return next(new AppError('Chat not found or you are not a participant.', 404));

  const sendAt = new Date(scheduledFor);
  if (Number.isNaN(sendAt.getTime()) || sendAt <= new Date()) {
    return next(new AppError('scheduledFor must be a valid future date.', 400));
  }

  const message = await Message.create({
    chat: chatId,
    sender: req.user.id,
    content,
    scheduledFor: sendAt,
    deliveredTo: [req.user.id],
    readBy: [req.user.id],
  });

  res.status(201).json({ status: 'success', data: { message } });
});

// @desc    Create a poll in a chat
// @route   POST /api/v1/messages/:chatId/poll
// @body    { question, options: ["Option A", "Option B", ...] }
// @access  Private
exports.createPoll = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const { question, options } = req.body;

  const chat = await Chat.findOne({ _id: chatId, participants: req.user.id });
  if (!chat) return next(new AppError('Chat not found or you are not a participant.', 404));

  if (!question?.trim() || !Array.isArray(options) || options.length < 2) {
    return next(new AppError('A question and at least 2 options are required.', 400));
  }

  const message = await Message.create({
    chat: chatId,
    sender: req.user.id,
    poll: {
      question: question.trim(),
      options: options.map((text) => ({ text, votes: [] })),
    },
    deliveredTo: [req.user.id],
    readBy: [req.user.id],
  });

  chat.lastMessage = message._id;
  await chat.save();

  const populated = await message.populate('sender', 'name avatar');
  const io = req.app.get('io');
  if (io) {
    chat.participants.forEach((p) => io.to(`user:${p}`).emit('message', populated));
  }

  res.status(201).json({ status: 'success', data: { message: populated } });
});

// @desc    Vote on a poll option (changes your previous vote on this poll, if any)
// @route   PATCH /api/v1/messages/message/:messageId/poll/vote
// @body    { optionIndex }
// @access  Private
exports.voteOnPoll = catchAsync(async (req, res, next) => {
  const { optionIndex } = req.body;
  const message = await Message.findById(req.params.messageId);

  if (!message || !message.poll) return next(new AppError('Poll not found.', 404));
  if (optionIndex < 0 || optionIndex >= message.poll.options.length) {
    return next(new AppError('Invalid option index.', 400));
  }

  message.poll.options.forEach((opt) => {
    opt.votes = opt.votes.filter((v) => v.toString() !== req.user.id);
  });
  message.poll.options[optionIndex].votes.push(req.user.id);
  await message.save();

  await emitToChat(req.app.get('io'), message.chat, 'pollUpdated', {
    messageId: message._id,
    poll: message.poll,
  });

  res.status(200).json({ status: 'success', data: { poll: message.poll } });
});
