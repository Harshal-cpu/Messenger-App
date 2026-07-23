const express = require('express');
const { body, param } = require('express-validator');
const messageController = require('../controllers/messageController');
const advancedController = require('../controllers/advancedMessageController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message history, sending, editing, reactions, pins, polls, scheduling
 */

router.use(protect);

// NOTE: static sub-paths ('/starred', '/search/all') must be declared before
// the dynamic '/:chatId' route or Express will try to match them as a chatId.
router.get('/starred', advancedController.getStarredMessages);
router.get('/search/all', advancedController.searchAllMessages);

/**
 * @swagger
 * /messages/{chatId}:
 *   get:
 *     summary: Get paginated message history for a chat
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200: { description: Paginated messages, newest page first }
 *   post:
 *     summary: Send a text message (REST fallback — Socket.IO 'message' event is primary)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties: { content: { type: string }, replyTo: { type: string } }
 *     responses:
 *       201: { description: Message created }
 */

router.get(
  '/:chatId',
  [param('chatId').isMongoId().withMessage('Invalid chat id')],
  validate,
  messageController.getMessages
);

router.get(
  '/:chatId/pinned',
  [param('chatId').isMongoId().withMessage('Invalid chat id')],
  validate,
  advancedController.getPinnedMessages
);

router.get(
  '/:chatId/search',
  [param('chatId').isMongoId().withMessage('Invalid chat id')],
  validate,
  advancedController.searchMessagesInChat
);

router.post(
  '/:chatId/schedule',
  [
    param('chatId').isMongoId().withMessage('Invalid chat id'),
    body('content').trim().notEmpty().withMessage('Message content is required'),
    body('scheduledFor').isISO8601().withMessage('scheduledFor must be a valid date'),
  ],
  validate,
  advancedController.scheduleMessage
);

router.post(
  '/:chatId/poll',
  [
    param('chatId').isMongoId().withMessage('Invalid chat id'),
    body('question').trim().notEmpty().withMessage('A poll question is required'),
    body('options').isArray({ min: 2 }).withMessage('At least 2 options are required'),
  ],
  validate,
  advancedController.createPoll
);

router.patch(
  '/message/:messageId/react',
  [param('messageId').isMongoId(), body('emoji').notEmpty()],
  validate,
  advancedController.reactToMessage
);

router.delete(
  '/message/:messageId/react',
  [param('messageId').isMongoId()],
  validate,
  advancedController.removeReaction
);

router.patch(
  '/message/:messageId/pin',
  [param('messageId').isMongoId()],
  validate,
  advancedController.togglePinMessage
);

router.patch(
  '/message/:messageId/star',
  [param('messageId').isMongoId()],
  validate,
  advancedController.toggleStarMessage
);

router.patch(
  '/message/:messageId/poll/vote',
  [param('messageId').isMongoId(), body('optionIndex').isInt({ min: 0 })],
  validate,
  advancedController.voteOnPoll
);

router.post(
  '/:chatId',
  [
    param('chatId').isMongoId().withMessage('Invalid chat id'),
    body('content').trim().notEmpty().withMessage('Message content is required'),
  ],
  validate,
  messageController.sendMessage
);

router.patch(
  '/:chatId/read',
  [param('chatId').isMongoId().withMessage('Invalid chat id')],
  validate,
  messageController.markChatAsRead
);

router.patch(
  '/message/:messageId',
  [
    param('messageId').isMongoId().withMessage('Invalid message id'),
    body('content').trim().notEmpty().withMessage('Message content is required'),
  ],
  validate,
  messageController.editMessage
);

router.delete(
  '/message/:messageId',
  [param('messageId').isMongoId().withMessage('Invalid message id')],
  validate,
  messageController.deleteMessage
);

module.exports = router;
