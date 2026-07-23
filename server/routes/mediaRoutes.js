const express = require('express');
const { param } = require('express-validator');
const mediaController = require('../controllers/mediaController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: File uploads via Cloudinary (avatars, group images, chat media)
 */

router.use(protect);

router.post('/avatar', upload.single('avatar'), mediaController.uploadAvatar);

router.post(
  '/group/:chatId',
  [param('chatId').isMongoId().withMessage('Invalid chat id')],
  validate,
  upload.single('groupImage'),
  mediaController.uploadGroupImage
);

router.post(
  '/chat/:chatId',
  [param('chatId').isMongoId().withMessage('Invalid chat id')],
  validate,
  upload.single('file'),
  mediaController.uploadChatMedia
);

module.exports = router;
