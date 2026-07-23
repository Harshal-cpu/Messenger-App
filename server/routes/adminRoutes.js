const express = require('express');
const { param } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints — requires role "admin"
 */

router.use(protect, restrictTo('admin'));

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Platform statistics for the admin dashboard
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Aggregate counts (users, chats, messages, activity) }
 *       403: { description: Not an admin }
 */
router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics/messages', adminController.getMessageAnalytics);

router.get('/users', adminController.listUsers);
router.patch(
  '/users/:id/deactivate',
  [param('id').isMongoId()],
  validate,
  adminController.deactivateUser
);
router.patch(
  '/users/:id/reactivate',
  [param('id').isMongoId()],
  validate,
  adminController.reactivateUser
);
router.patch(
  '/users/:id/make-admin',
  [param('id').isMongoId()],
  validate,
  adminController.makeAdmin
);

router.get('/chats', adminController.listChats);

module.exports = router;
