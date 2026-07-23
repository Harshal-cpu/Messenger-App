const express = require('express');
const pushController = require('../controllers/pushController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Push
 *   description: Web Push notification subscription management
 */

router.use(protect);

/**
 * @swagger
 * /push/vapid-public-key:
 *   get:
 *     summary: Get the VAPID public key needed to create a push subscription
 *     tags: [Push]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Public key, or null if push isn't configured on the server }
 */
router.get('/vapid-public-key', pushController.getVapidPublicKey);

/**
 * @swagger
 * /push/subscribe:
 *   post:
 *     summary: Register this browser/device for push notifications
 *     tags: [Push]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Subscribed }
 */
router.post('/subscribe', pushController.subscribe);

/**
 * @swagger
 * /push/unsubscribe:
 *   post:
 *     summary: Unregister this browser/device from push notifications
 *     tags: [Push]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unsubscribed }
 */
router.post('/unsubscribe', pushController.unsubscribe);

module.exports = router;
