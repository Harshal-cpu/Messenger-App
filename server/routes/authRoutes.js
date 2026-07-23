const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Registration, login, tokens, and password management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Create a new account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Jane Doe }
 *               email: { type: string, example: jane@example.com }
 *               password: { type: string, example: secret123 }
 *     responses:
 *       201:
 *         description: Account created — returns accessToken + user, sets refresh cookie
 *       409:
 *         description: Email already in use
 *       400:
 *         description: Validation error
 */
router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 50 }),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain a number'),
  ],
  validate,
  authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate with email + password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Returns accessToken + user, sets refresh cookie
 *       401:
 *         description: Incorrect email or password
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out (clears refresh cookie, marks user offline)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out successfully }
 */
router.post('/logout', protect, authController.logout);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Exchange the httpOnly refresh cookie for a new access token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Returns a new accessToken }
 *       401: { description: Missing/invalid/expired refresh token }
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: The current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties: { user: { $ref: '#/components/schemas/User' } }
 */
router.get('/me', protect, authController.getMe);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties: { email: { type: string } }
 *     responses:
 *       200: { description: Generic success message (doesn't reveal whether the email exists) }
 */
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().withMessage('A valid email is required').normalizeEmail()],
  validate,
  authController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   patch:
 *     summary: Reset password using the token emailed by /forgot-password
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties: { password: { type: string } }
 *     responses:
 *       200: { description: Password reset — returns a new accessToken }
 *       400: { description: Token invalid or expired }
 */
router.patch(
  '/reset-password/:token',
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validate,
  authController.resetPassword
);

/**
 * @swagger
 * /auth/change-password:
 *   patch:
 *     summary: Change password while logged in
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Password changed — returns a new accessToken }
 *       401: { description: Current password incorrect }
 */
router.patch(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  validate,
  authController.changePassword
);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verify email address using the token emailed at registration
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Token invalid or expired }
 */
router.get('/verify-email/:token', authController.verifyEmail);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Resend the email verification link
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Verification email sent }
 *       400: { description: Already verified }
 */
router.post('/resend-verification', protect, authController.resendVerification);

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: List active sessions/devices for the current user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of active sessions with device info }
 *   delete:
 *     summary: Sign out all other devices (keeps current session active)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Count of sessions revoked }
 */
router.get('/sessions', protect, authController.getSessions);
router.delete('/sessions', protect, authController.revokeAllOtherSessions);

/**
 * @swagger
 * /auth/sessions/{id}:
 *   delete:
 *     summary: Sign out a specific device/session
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Session signed out }
 *       404: { description: Session not found }
 */
router.delete('/sessions/:id', protect, authController.revokeSession);

module.exports = router;
