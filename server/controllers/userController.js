const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const PUBLIC_FIELDS = 'name email avatar bio isOnline lastSeen createdAt';

// @desc    Search users by name or email (excludes self)
// @route   GET /api/v1/users/search?query=jane&page=1&limit=20
// @access  Private
exports.searchUsers = catchAsync(async (req, res, next) => {
  const { query = '' } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const skip = (page - 1) * limit;

  if (!query.trim()) {
    return next(new AppError('A search query is required.', 400));
  }

  const filter = {
    _id: { $ne: req.user.id },
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
    ],
  };

  const [users, total] = await Promise.all([
    User.find(filter).select(PUBLIC_FIELDS).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { users },
  });
});

// @desc    Get a single user's public profile
// @route   GET /api/v1/users/:id
// @access  Private
exports.getUserProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select(PUBLIC_FIELDS);

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  // Don't reveal profile details of someone who has blocked you, or vice versa
  const requester = await User.findById(req.user.id).select('blockedUsers');
  const targetBlockedRequester = await User.findOne({
    _id: req.params.id,
    blockedUsers: req.user.id,
  });

  if (
    requester.blockedUsers.includes(req.params.id) ||
    targetBlockedRequester
  ) {
    return next(new AppError('This profile is not available.', 403));
  }

  res.status(200).json({ status: 'success', data: { user } });
});

// @desc    Update own profile (name, bio) — avatar upload handled in the media module
// @route   PATCH /api/v1/users/me
// @access  Private
exports.updateProfile = catchAsync(async (req, res, next) => {
  const allowedFields = ['name', 'bio'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid fields provided to update.', 400));
  }

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', data: { user } });
});

// @desc    Block a user (also removes existing friendship)
// @route   PATCH /api/v1/users/:id/block
// @access  Private
exports.blockUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return next(new AppError('You cannot block yourself.', 400));
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    return next(new AppError('User not found.', 404));
  }

  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: { blockedUsers: id },
    $pull: { friends: id },
  });
  await User.findByIdAndUpdate(id, { $pull: { friends: req.user.id } });

  res.status(200).json({ status: 'success', message: 'User blocked.' });
});

// @desc    Unblock a previously blocked user
// @route   PATCH /api/v1/users/:id/unblock
// @access  Private
exports.unblockUser = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { blockedUsers: req.params.id },
  });

  res.status(200).json({ status: 'success', message: 'User unblocked.' });
});

// @desc    Get the current user's friends list
// @route   GET /api/v1/users/me/friends
// @access  Private
exports.getFriends = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate(
    'friends',
    PUBLIC_FIELDS
  );

  res.status(200).json({
    status: 'success',
    results: user.friends.length,
    data: { friends: user.friends },
  });
});

// @desc    Get the current user's blocked users list
// @route   GET /api/v1/users/me/blocked
// @access  Private
exports.getBlockedUsers = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate(
    'blockedUsers',
    PUBLIC_FIELDS
  );

  res.status(200).json({
    status: 'success',
    results: user.blockedUsers.length,
    data: { blockedUsers: user.blockedUsers },
  });
});

// @desc    Remove an existing friend (unfriend, not a block)
// @route   DELETE /api/v1/users/friends/:id
// @access  Private
exports.removeFriend = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  await User.findByIdAndUpdate(req.user.id, { $pull: { friends: id } });
  await User.findByIdAndUpdate(id, { $pull: { friends: req.user.id } });

  res.status(200).json({ status: 'success', message: 'Friend removed.' });
});
