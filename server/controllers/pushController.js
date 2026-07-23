const PushSubscription = require('../models/PushSubscription');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// @desc    Register this device/browser for push notifications
// @route   POST /api/v1/push/subscribe
// @body    { endpoint, keys: { p256dh, auth } }
// @access  Private
exports.subscribe = catchAsync(async (req, res, next) => {
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return next(new AppError('A valid push subscription object is required.', 400));
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.user.id, endpoint, keys },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({ status: 'success', message: 'Subscribed to push notifications.' });
});

// @desc    Unregister this device/browser from push notifications
// @route   POST /api/v1/push/unsubscribe
// @body    { endpoint }
// @access  Private
exports.unsubscribe = catchAsync(async (req, res, next) => {
  const { endpoint } = req.body;
  if (!endpoint) return next(new AppError('An "endpoint" is required.', 400));

  await PushSubscription.deleteOne({ endpoint, user: req.user.id });
  res.status(200).json({ status: 'success', message: 'Unsubscribed from push notifications.' });
});

// @desc    Get the VAPID public key so the client can subscribe
// @route   GET /api/v1/push/vapid-public-key
// @access  Private
exports.getVapidPublicKey = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: { publicKey: process.env.VAPID_PUBLIC_KEY || null },
  });
});
