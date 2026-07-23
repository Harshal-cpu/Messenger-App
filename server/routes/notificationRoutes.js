const express = require('express');
const { param } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notifications (friend requests, mentions, etc.)
 */

router.use(protect);

router.get('/', notificationController.getMyNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch(
  '/:id/read',
  [param('id').isMongoId().withMessage('Invalid notification id')],
  validate,
  notificationController.markAsRead
);

module.exports = router;
