const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Search, profiles, block/unblock, friends list
 */

router.use(protect); // every route below requires authentication

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users by name or email
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated list of matching users }
 */
router.get('/search', userController.searchUsers);

router.get('/me/friends', userController.getFriends);
router.get('/me/blocked', userController.getBlockedUsers);
router.delete('/friends/:id', userController.removeFriend);

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update your own name/bio
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { name: { type: string }, bio: { type: string } }
 *     responses:
 *       200: { description: Updated user }
 */
router.patch(
  '/me',
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('bio').optional().trim().isLength({ max: 160 }),
  ],
  validate,
  userController.updateProfile
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: View a user's public profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The user's public profile }
 *       403: { description: Profile unavailable (blocked either direction) }
 *       404: { description: User not found }
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid user id')],
  validate,
  userController.getUserProfile
);

/**
 * @swagger
 * /users/{id}/block:
 *   patch:
 *     summary: Block a user (also removes any existing friendship)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User blocked }
 */
router.patch(
  '/:id/block',
  [param('id').isMongoId().withMessage('Invalid user id')],
  validate,
  userController.blockUser
);

router.patch(
  '/:id/unblock',
  [param('id').isMongoId().withMessage('Invalid user id')],
  validate,
  userController.unblockUser
);

module.exports = router;
