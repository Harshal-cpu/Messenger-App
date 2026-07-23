const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Protects routes: requires a valid Bearer access token.
 * Attaches the authenticated user to req.user.
 */
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access.', 401)
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('Password was recently changed. Please log in again.', 401)
    );
  }

  req.user = currentUser;
  next();
});

/**
 * Restricts a route to specific user roles. Must be used after `protect`,
 * since it relies on req.user being set.
 * Usage: router.get('/admin-only', protect, restrictTo('admin'), handler)
 */
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

/**
 * Optional auth: attaches req.user if a valid token is present,
 * but does not block the request if it's missing/invalid.
 * Useful for public endpoints that behave differently for logged-in users.
 */
exports.optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (currentUser) req.user = currentUser;
  } catch (err) {
    // Ignore invalid token for optional auth
  }

  next();
});
