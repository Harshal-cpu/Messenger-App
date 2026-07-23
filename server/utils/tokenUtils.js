const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Signs a short-lived access token carrying the user id.
 */
const signAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

/**
 * Signs a long-lived refresh token, used to silently obtain new access
 * tokens without forcing the user to log in again.
 */
const signRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

/**
 * One-way hash of a refresh token for session-tracking storage — same
 * principle as password hashing: we never store the token itself, only
 * something we can compare against without being able to reverse it.
 */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Sends the access token in the JSON body and the refresh token as an
 * httpOnly cookie, then strips sensitive fields from the user object
 * before returning it to the client.
 *
 * Cookie path is scoped to /api/v1/auth (not just /refresh-token) so it's
 * also sent on /logout and /sessions requests, which need to read it.
 */
const sendTokenResponse = (user, statusCode, res, extra = {}) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  const cookieExpiresDays = Number(process.env.JWT_COOKIE_EXPIRES_DAYS) || 30;

  res.cookie('refreshToken', refreshToken, {
    expires: new Date(Date.now() + cookieExpiresDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });

  const safeUser = user.toObject();
  delete safeUser.password;
  delete safeUser.passwordResetToken;
  delete safeUser.passwordResetExpires;
  delete safeUser.emailVerificationToken;
  delete safeUser.emailVerificationExpires;
  delete safeUser.__v;

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    data: { user: safeUser },
    ...extra,
  });

  return refreshToken;
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  sendTokenResponse,
};
