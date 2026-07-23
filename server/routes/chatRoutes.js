const express = require('express');
const { param, body } = require('express-validator');
const chatController = require('../controllers/chatController');
const prefsController = require('../controllers/chatPreferencesController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Chats
 *   description: 1:1 chat creation, listing, and per-user preferences (mute/archive/pin/theme)
 */

router.use(protect);

/**
 * @swagger
 * /chats:
 *   get:
 *     summary: List all your chats, sorted by activity, with unread counts
 *     tags: [Chats]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of chats the current user participates in }
 */
router.get('/', chatController.getMyChats);

router.patch(
  '/:chatId/mute',
  [param('chatId').isMongoId()],
  validate,
  prefsController.toggleMute
);

router.patch(
  '/:chatId/archive',
  [param('chatId').isMongoId()],
  validate,
  prefsController.toggleArchive
);

router.patch(
  '/:chatId/pin',
  [param('chatId').isMongoId()],
  validate,
  prefsController.togglePinChat
);

router.patch(
  '/:chatId/theme',
  [param('chatId').isMongoId(), body('theme').notEmpty()],
  validate,
  prefsController.setTheme
);

/**
 * @swagger
 * /chats/one-to-one/{userId}:
 *   post:
 *     summary: Get or create a 1:1 chat with another user (idempotent)
 *     tags: [Chats]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The existing or newly created chat }
 */
router.post(
  '/one-to-one/:userId',
  [param('userId').isMongoId().withMessage('Invalid user id')],
  validate,
  chatController.accessOneToOneChat
);

router.get(
  '/:chatId',
  [param('chatId').isMongoId().withMessage('Invalid chat id')],
  validate,
  chatController.getChatById
);

module.exports = router;
