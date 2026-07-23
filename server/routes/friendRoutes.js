const express = require('express');
const { param } = require('express-validator');
const friendController = require('../controllers/friendController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Friend requests — send, accept, reject, cancel
 */

router.use(protect);
router.get('/requests/sent', friendController.getSentRequests);

router.post(
  '/request/:userId',
  [param('userId').isMongoId().withMessage('Invalid user id')],
  validate,
  friendController.sendFriendRequest
);

router.patch(
  '/accept/:requestId',
  [param('requestId').isMongoId().withMessage('Invalid request id')],
  validate,
  friendController.acceptFriendRequest
);

router.patch(
  '/reject/:requestId',
  [param('requestId').isMongoId().withMessage('Invalid request id')],
  validate,
  friendController.rejectFriendRequest
);

router.delete(
  '/cancel/:requestId',
  [param('requestId').isMongoId().withMessage('Invalid request id')],
  validate,
  friendController.cancelFriendRequest
);

module.exports = router;
