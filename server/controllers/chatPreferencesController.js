const Chat = require('../models/Chat');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const toggleUserInArray = (chat, field, userId) => {
  const has = chat[field].some((u) => u.toString() === userId);
  if (has) {
    chat[field] = chat[field].filter((u) => u.toString() !== userId);
  } else {
    chat[field].push(userId);
  }
  return !has; // returns the new state (true = now in the array)
};

const assertMember = async (chatId, userId, next) => {
  const chat = await Chat.findOne({ _id: chatId, participants: userId });
  if (!chat) {
    throw new AppError('Chat not found or you are not a participant.', 404);
  }
  return chat;
};

// @desc    Toggle mute on a chat for the current user
// @route   PATCH /api/v1/chats/:chatId/mute
// @access  Private
exports.toggleMute = catchAsync(async (req, res, next) => {
  const chat = await assertMember(req.params.chatId, req.user.id, next);
  const muted = toggleUserInArray(chat, 'mutedBy', req.user.id);
  await chat.save();
  res.status(200).json({ status: 'success', muted });
});

// @desc    Toggle archive on a chat for the current user
// @route   PATCH /api/v1/chats/:chatId/archive
// @access  Private
exports.toggleArchive = catchAsync(async (req, res, next) => {
  const chat = await assertMember(req.params.chatId, req.user.id, next);
  const archived = toggleUserInArray(chat, 'archivedBy', req.user.id);
  await chat.save();
  res.status(200).json({ status: 'success', archived });
});

// @desc    Toggle pin on a chat for the current user (pinned chats show at top of sidebar)
// @route   PATCH /api/v1/chats/:chatId/pin
// @access  Private
exports.togglePinChat = catchAsync(async (req, res, next) => {
  const chat = await assertMember(req.params.chatId, req.user.id, next);
  const pinned = toggleUserInArray(chat, 'pinnedBy', req.user.id);
  await chat.save();
  res.status(200).json({ status: 'success', pinned });
});

// @desc    Set a chat's visual theme (applies for all participants)
// @route   PATCH /api/v1/chats/:chatId/theme
// @body    { theme }
// @access  Private
exports.setTheme = catchAsync(async (req, res, next) => {
  const { theme } = req.body;
  if (!theme?.trim()) return next(new AppError('A theme name is required.', 400));

  const chat = await assertMember(req.params.chatId, req.user.id, next);
  chat.theme = theme.trim();
  await chat.save();

  const io = req.app.get('io');
  if (io) {
    chat.participants.forEach((p) =>
      io.to(`user:${p}`).emit('chatThemeChanged', { chatId: chat._id, theme: chat.theme })
    );
  }

  res.status(200).json({ status: 'success', data: { theme: chat.theme } });
});
