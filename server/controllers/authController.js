const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendTokenResponse, signAccessToken, hashToken } = require('../utils/tokenUtils');
const sendEmail = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Creates a Session record for a newly issued refresh token, so it shows
 * up in "manage devices" and can be individually revoked later. Failures
 * here are logged but never block login/register — session tracking is a
 * nice-to-have, not a hard requirement for auth to function.
 */
async function createSession(user, refreshToken, req) {
  try {
    await Session.create({
      user: user._id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: req.headers['user-agent'] || 'Unknown device',
      ip: req.ip,
    });
  } catch (err) {
    logger.error('Failed to create session record', { message: err.message });
  }
}

/**
 * Sends an email verification link. Failure here never blocks
 * registration — the account still works, just unverified.
 */
async function sendVerificationEmail(user) {
  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verifyURL = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'Verify your email address',
      message: `Welcome! Please verify your email by visiting: ${verifyURL}\n\nThis link expires in 24 hours.`,
    });
  } catch (err) {
    logger.error('Failed to send verification email', { message: err.message });
  }
}

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const user = await User.create({ name, email, password });

  sendVerificationEmail(user).catch(() => {});

  const refreshToken = sendTokenResponse(user, 201, res);
  await createSession(user, refreshToken, req);
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  user.isOnline = true;
  user.lastSeen = Date.now();
  await user.save({ validateBeforeSave: false });

  const refreshToken = sendTokenResponse(user, 200, res);
  await createSession(user, refreshToken, req);
});

// @desc    Logout user (revokes this device's session, clears cookie, marks offline)
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await Session.findOneAndUpdate(
      { refreshTokenHash: hashToken(token) },
      { revoked: true }
    );
  }

  if (req.user) {
    req.user.isOnline = false;
    req.user.lastSeen = Date.now();
    await req.user.save({ validateBeforeSave: false });
  }

  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    path: '/api/v1/auth',
  });

  res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
});

// @desc    Issue a new access token using the refresh token cookie
// @route   POST /api/v1/auth/refresh-token
// @access  Public (requires valid refresh cookie)
exports.refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return next(new AppError('No refresh token provided. Please log in.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return next(new AppError('Invalid or expired refresh token. Please log in again.', 401));
  }

  // Check the session hasn't been revoked (e.g. via "sign out this device"
  // elsewhere) — a still-valid JWT signature isn't enough on its own once
  // we support revocation, since JWTs can't be un-signed early by design.
  const session = await Session.findOne({ refreshTokenHash: hashToken(token) });
  if (!session || session.revoked) {
    return next(new AppError('This session has been signed out. Please log in again.', 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('User no longer exists.', 401));
  }

  session.lastUsedAt = Date.now();
  await session.save();

  const accessToken = signAccessToken(user._id);
  res.status(200).json({ status: 'success', accessToken });
});

// @desc    Get currently authenticated user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'success', data: { user: req.user } });
});

// @desc    Verify email address using the token emailed at registration
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Verification link is invalid or has expired.', 400));
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', message: 'Email verified successfully.' });
});

// @desc    Resend the email verification link
// @route   POST /api/v1/auth/resend-verification
// @access  Private
exports.resendVerification = catchAsync(async (req, res, next) => {
  if (req.user.emailVerified) {
    return next(new AppError('Your email is already verified.', 400));
  }

  await sendVerificationEmail(req.user);
  res.status(200).json({ status: 'success', message: 'Verification email sent.' });
});

// @desc    Request a password reset email
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  // Always respond with success to avoid leaking which emails are registered
  const genericMessage = {
    status: 'success',
    message: 'If an account with that email exists, a reset link has been sent.',
  };

  if (!user) {
    return res.status(200).json(genericMessage);
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  const message = `You requested a password reset. Submit a PATCH request with your new password to: ${resetURL}\n\nIf you did not request this, please ignore this email.`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Your password reset token (valid for 10 minutes)',
      message,
    });
    res.status(200).json(genericMessage);
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Please try again later.', 500)
    );
  }
});

// @desc    Reset password using token from email
// @route   PATCH /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired.', 400));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const refreshToken = sendTokenResponse(user, 200, res);
  await createSession(user, refreshToken, req);
});

// @desc    Change password while logged in
// @route   PATCH /api/v1/auth/change-password
// @access  Private
exports.changePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  const refreshToken = sendTokenResponse(user, 200, res);
  await createSession(user, refreshToken, req);
});

// @desc    List active sessions/devices for the current user
// @route   GET /api/v1/auth/sessions
// @access  Private
exports.getSessions = catchAsync(async (req, res, next) => {
  const currentToken = req.cookies?.refreshToken;
  const currentHash = currentToken ? hashToken(currentToken) : null;

  const sessions = await Session.find({ user: req.user.id, revoked: false })
    .sort({ lastUsedAt: -1 })
    .select('userAgent ip lastUsedAt createdAt refreshTokenHash');

  const withCurrentFlag = sessions.map((s) => ({
    _id: s._id,
    userAgent: s.userAgent,
    ip: s.ip,
    lastUsedAt: s.lastUsedAt,
    createdAt: s.createdAt,
    isCurrent: s.refreshTokenHash === currentHash,
  }));

  res.status(200).json({ status: 'success', data: { sessions: withCurrentFlag } });
});

// @desc    Revoke a specific session (sign out that device)
// @route   DELETE /api/v1/auth/sessions/:id
// @access  Private
exports.revokeSession = catchAsync(async (req, res, next) => {
  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { revoked: true },
    { new: true }
  );

  if (!session) return next(new AppError('Session not found.', 404));

  res.status(200).json({ status: 'success', message: 'Session signed out.' });
});

// @desc    Revoke all sessions except the current one ("sign out other devices")
// @route   DELETE /api/v1/auth/sessions
// @access  Private
exports.revokeAllOtherSessions = catchAsync(async (req, res, next) => {
  const currentToken = req.cookies?.refreshToken;
  const currentHash = currentToken ? hashToken(currentToken) : null;

  const result = await Session.updateMany(
    { user: req.user.id, revoked: false, refreshTokenHash: { $ne: currentHash } },
    { revoked: true }
  );

  res.status(200).json({ status: 'success', revokedCount: result.modifiedCount });
});
