const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const notify = require('../utils/notify');

const PUBLIC_FIELDS = 'name email avatar bio isOnline lastSeen';

// @desc    Send a friend request
// @route   POST /api/v1/friends/request/:userId
// @access  Private
exports.sendFriendRequest = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const senderId = req.user.id;

  if (userId === senderId) {
    return next(new AppError('You cannot send a friend request to yourself.', 400));
  }

  const recipient = await User.findById(userId);
  if (!recipient) {
    return next(new AppError('User not found.', 404));
  }

  const sender = await User.findById(senderId);
  if (sender.friends.includes(userId)) {
    return next(new AppError('You are already friends with this user.', 409));
  }

  if (
    sender.blockedUsers.includes(userId) ||
    recipient.blockedUsers.includes(senderId)
  ) {
    return next(new AppError('Unable to send a friend request to this user.', 403));
  }

  const existing = await FriendRequest.findOne({
    sender: senderId,
    recipient: userId,
    status: 'pending',
  });
  if (existing) {
    return next(new AppError('A friend request is already pending.', 409));
  }

  // If the recipient already sent us a request, auto-accept instead of duplicating
  const reverseRequest = await FriendRequest.findOne({
    sender: userId,
    recipient: senderId,
    status: 'pending',
  });

  if (reverseRequest) {
    reverseRequest.status = 'accepted';
    await reverseRequest.save();

    await User.findByIdAndUpdate(senderId, { $addToSet: { friends: userId } });
    await User.findByIdAndUpdate(userId, { $addToSet: { friends: senderId } });

    await notify(req.app.get('io'), {
      recipient: userId,
      sender: senderId,
      type: 'friend_request_accepted',
      message: `${sender.name} accepted your friend request.`,
      relatedId: reverseRequest._id,
    });

    return res.status(200).json({
      status: 'success',
      message: 'You are now friends.',
      data: { friendRequest: reverseRequest },
    });
  }

  const friendRequest = await FriendRequest.create({
    sender: senderId,
    recipient: userId,
  });

  await notify(req.app.get('io'), {
    recipient: userId,
    sender: senderId,
    type: 'friend_request',
    message: `${sender.name} sent you a friend request.`,
    relatedId: friendRequest._id,
  });

  res.status(201).json({ status: 'success', data: { friendRequest } });
});

// @desc    Get friend requests received by the current user
// @route   GET /api/v1/friends/requests
// @access  Private
exports.getReceivedRequests = catchAsync(async (req, res, next) => {
  const requests = await FriendRequest.find({
    recipient: req.user.id,
    status: 'pending',
  }).populate('sender', PUBLIC_FIELDS);

  res.status(200).json({
    status: 'success',
    results: requests.length,
    data: { requests },
  });
});

// @desc    Get friend requests sent by the current user
// @route   GET /api/v1/friends/requests/sent
// @access  Private
exports.getSentRequests = catchAsync(async (req, res, next) => {
  const requests = await FriendRequest.find({
    sender: req.user.id,
    status: 'pending',
  }).populate('recipient', PUBLIC_FIELDS);

  res.status(200).json({
    status: 'success',
    results: requests.length,
    data: { requests },
  });
});

// @desc    Accept a received friend request
// @route   PATCH /api/v1/friends/accept/:requestId
// @access  Private
exports.acceptFriendRequest = catchAsync(async (req, res, next) => {
  const request = await FriendRequest.findOne({
    _id: req.params.requestId,
    recipient: req.user.id,
    status: 'pending',
  });

  if (!request) {
    return next(new AppError('Friend request not found.', 404));
  }

  request.status = 'accepted';
  await request.save();

  await User.findByIdAndUpdate(request.sender, {
    $addToSet: { friends: request.recipient },
  });
  await User.findByIdAndUpdate(request.recipient, {
    $addToSet: { friends: request.sender },
  });

  await notify(req.app.get('io'), {
    recipient: request.sender.toString(),
    sender: req.user.id,
    type: 'friend_request_accepted',
    message: `${req.user.name} accepted your friend request.`,
    relatedId: request._id,
  });

  res.status(200).json({ status: 'success', data: { friendRequest: request } });
});

// @desc    Reject a received friend request
// @route   PATCH /api/v1/friends/reject/:requestId
// @access  Private
exports.rejectFriendRequest = catchAsync(async (req, res, next) => {
  const request = await FriendRequest.findOneAndUpdate(
    { _id: req.params.requestId, recipient: req.user.id, status: 'pending' },
    { status: 'rejected' },
    { new: true }
  );

  if (!request) {
    return next(new AppError('Friend request not found.', 404));
  }

  res.status(200).json({ status: 'success', data: { friendRequest: request } });
});

// @desc    Cancel a friend request you sent
// @route   DELETE /api/v1/friends/cancel/:requestId
// @access  Private
exports.cancelFriendRequest = catchAsync(async (req, res, next) => {
  const request = await FriendRequest.findOneAndDelete({
    _id: req.params.requestId,
    sender: req.user.id,
    status: 'pending',
  });

  if (!request) {
    return next(new AppError('Friend request not found.', 404));
  }

  res.status(200).json({ status: 'success', message: 'Friend request cancelled.' });
});
