const express = require('express');
const linkPreviewController = require('../controllers/linkPreviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: LinkPreview
 *   description: Server-side Open Graph link unfurling for messages containing URLs
 */

router.use(protect);

/**
 * @swagger
 * /link-preview:
 *   get:
 *     summary: Fetch Open Graph preview data for a URL
 *     tags: [LinkPreview]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Preview data, or { data: null } if unavailable" }
 *       400: { description: Invalid or disallowed URL }
 */
router.get('/', linkPreviewController.getLinkPreview);

module.exports = router;
