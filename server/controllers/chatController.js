const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const CHAT_POPULATE_FIELDS = 'name email avatar isOnline lastSeen';

// @desc    Get or create a 1:1 chat with another user
// @route   POST /api/v1/chats/one-to-one/:userId
// @access  Private
exports.accessOneToOneChat = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const myId = req.user.id;

  if (userId === myId) {
    return next(new AppError('You cannot start a chat with yourself.', 400));
  }

  const otherUser = await User.findById(userId);
  if (!otherUser) {
    return next(new AppError('User not found.', 404));
  }

  const me = await User.findById(myId);
  if (
    me.blockedUsers.includes(userId) ||
    otherUser.blockedUsers.includes(myId)
  ) {
    return next(new AppError('You cannot chat with this user.', 403));
  }

  let chat = await Chat.findOne({
    isGroup: false,
    participants: { $all: [myId, userId], $size: 2 },
  }).populate('participants', CHAT_POPULATE_FIELDS);

  if (!chat) {
    chat = await Chat.create({
      isGroup: false,
      participants: [myId, userId],
    });
    chat = await chat.populate('participants', CHAT_POPULATE_FIELDS);
  }

  res.status(200).json({ status: 'success', data: { chat } });
});

// @desc    List all chats (1:1 and group) the current user is part of,
//          sorted by most recent activity, with unread counts
// @route   GET /api/v1/chats
// @access  Private
exports.getMyChats = catchAsync(async (req, res, next) => {
  const chats = await Chat.find({ participants: req.user.id })
    .populate('participants', CHAT_POPULATE_FIELDS)
    .populate({
      path: 'lastMessage',
      select: 'content sender media createdAt deletedForEveryone',
    })
    .sort({ updatedAt: -1 });

  const chatsWithUnread = await Promise.all(
    chats.map(async (chat) => {
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        sender: { $ne: req.user.id },
        readBy: { $ne: req.user.id },
        deletedFor: { $ne: req.user.id },
      });
      return { ...chat.toObject(), unreadCount };
    })
  );

  res.status(200).json({
    status: 'success',
    results: chatsWithUnread.length,
    data: { chats: chatsWithUnread },
  });
});

// @desc    Get a single chat by id (must be a participant)
// @route   GET /api/v1/chats/:chatId
// @access  Private
exports.getChatById = catchAsync(async (req, res, next) => {
  const chat = await Chat.findOne({
    _id: req.params.chatId,
    participants: req.user.id,
  }).populate('participants', CHAT_POPULATE_FIELDS);

  if (!chat) {
    return next(new AppError('Chat not found.', 404));
  }

  res.status(200).json({ status: 'success', data: { chat } });
});
