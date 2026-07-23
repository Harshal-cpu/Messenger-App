const express = require('express');
const { body, param } = require('express-validator');
const groupController = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group chat creation and management (rename, members, admins)
 */

router.use(protect);

router.post(
  '/',
  [
    body('groupName').trim().notEmpty().withMessage('Group name is required').isLength({ max: 100 }),
    body('memberIds').isArray({ min: 2 }).withMessage('At least 2 other members are required'),
  ],
  validate,
  groupController.createGroup
);

router.patch(
  '/:chatId/rename',
  [
    param('chatId').isMongoId(),
    body('groupName').trim().notEmpty().isLength({ max: 100 }),
  ],
  validate,
  groupController.renameGroup
);

router.patch(
  '/:chatId/add',
  [param('chatId').isMongoId(), body('memberIds').isArray({ min: 1 })],
  validate,
  groupController.addMembers
);

router.patch(
  '/:chatId/remove/:userId',
  [param('chatId').isMongoId(), param('userId').isMongoId()],
  validate,
  groupController.removeMember
);

router.patch(
  '/:chatId/promote/:userId',
  [param('chatId').isMongoId(), param('userId').isMongoId()],
  validate,
  groupController.promoteToAdmin
);

router.delete(
  '/:chatId/leave',
  [param('chatId').isMongoId()],
  validate,
  groupController.leaveGroup
);

router.delete(
  '/:chatId',
  [param('chatId').isMongoId()],
  validate,
  groupController.deleteGroup
);

module.exports = router;
