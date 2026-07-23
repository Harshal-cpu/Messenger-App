const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// @desc    Get high-level platform statistics for the admin dashboard
// @route   GET /api/v1/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    onlineUsers,
    newUsers7d,
    totalChats,
    totalGroupChats,
    totalMessages,
    messages24h,
    activeUsersToday,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isOnline: true }),
    User.countDocuments({ createdAt: { $gte: since7d } }),
    Chat.countDocuments(),
    Chat.countDocuments({ isGroup: true }),
    Message.countDocuments(),
    Message.countDocuments({ createdAt: { $gte: since24h } }),
    Message.distinct('sender', { createdAt: { $gte: since24h } }),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalUsers,
      onlineUsers,
      newUsers7d,
      totalChats,
      totalGroupChats,
      totalMessages,
      messages24h,
      activeUsersToday: activeUsersToday.length,
    },
  });
});

// @desc    List all users with pagination and optional name/email search
// @route   GET /api/v1/admin/users?query=&page=1&limit=20
// @access  Private/Admin
exports.listUsers = catchAsync(async (req, res, next) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { query = '' } = req.query;

  const filter = query.trim()
    ? {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email avatar role isOnline lastSeen active createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { users },
  });
});

// @desc    Deactivate (soft-ban) a user account
// @route   PATCH /api/v1/admin/users/:id/deactivate
// @access  Private/Admin
exports.deactivateUser = catchAsync(async (req, res, next) => {
  if (req.params.id === req.user.id) {
    return next(new AppError('You cannot deactivate your own account.', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true }
  );
  if (!user) return next(new AppError('User not found.', 404));

  res.status(200).json({ status: 'success', message: 'User deactivated.' });
});

// @desc    Reactivate a previously deactivated user account
// @route   PATCH /api/v1/admin/users/:id/reactivate
// @access  Private/Admin
exports.reactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id },
    { active: true },
    { new: true }
  ).setOptions({ includeInactive: true });

  if (!user) return next(new AppError('User not found.', 404));

  res.status(200).json({ status: 'success', message: 'User reactivated.' });
});

// @desc    Promote a user to admin
// @route   PATCH /api/v1/admin/users/:id/make-admin
// @access  Private/Admin
exports.makeAdmin = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: 'admin' },
    { new: true }
  );
  if (!user) return next(new AppError('User not found.', 404));

  res.status(200).json({ status: 'success', data: { user } });
});

// @desc    List chats for monitoring (metadata only — not message content)
// @route   GET /api/v1/admin/chats?page=1&limit=20
// @access  Private/Admin
exports.listChats = catchAsync(async (req, res, next) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const [chats, total] = await Promise.all([
    Chat.find()
      .populate('participants', 'name email')
      .select('isGroup groupName participants createdAt updatedAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ updatedAt: -1 }),
    Chat.countDocuments(),
  ]);

  res.status(200).json({
    status: 'success',
    results: chats.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { chats },
  });
});

// @desc    Basic analytics: message volume per day for the last N days
// @route   GET /api/v1/admin/analytics/messages?days=7
// @access  Private/Admin
exports.getMessageAnalytics = catchAsync(async (req, res, next) => {
  const days = Math.min(Number(req.query.days) || 7, 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const results = await Message.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    status: 'success',
    data: { messagesPerDay: results.map((r) => ({ date: r._id, count: r.count })) },
  });
});
