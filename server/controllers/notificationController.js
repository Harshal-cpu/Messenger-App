const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// @desc    Get the current user's notifications (paginated)
// @route   GET /api/v1/notifications?page=1&limit=20
// @access  Private
exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const [notifications, unreadCount, total] = await Promise.all([
    Notification.find({ recipient: req.user.id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments({ recipient: req.user.id, read: false }),
    Notification.countDocuments({ recipient: req.user.id }),
  ]);

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    unreadCount,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { notifications },
  });
});

// @desc    Mark a single notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { read: true },
    { new: true }
  );

  if (!notification) return next(new AppError('Notification not found.', 404));

  res.status(200).json({ status: 'success', data: { notification } });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Private
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  const result = await Notification.updateMany(
    { recipient: req.user.id, read: false },
    { read: true }
  );

  res.status(200).json({ status: 'success', modifiedCount: result.modifiedCount });
});
