const dns = require('dns').promises;
const ogs = require('open-graph-scraper');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

const PRIVATE_IP_RANGES = [
  /^127\./, // loopback
  /^10\./, // private
  /^172\.(1[6-9]|2\d|3[0-1])\./, // private
  /^192\.168\./, // private
  /^169\.254\./, // link-local
  /^::1$/, // IPv6 loopback
  /^fc00:/, // IPv6 private
  /^fe80:/, // IPv6 link-local
];

/**
 * Guards against SSRF: this endpoint fetches whatever URL the client sends,
 * so we must make sure that URL can't be used to reach internal
 * infrastructure (cloud metadata endpoints, internal services, localhost).
 */
async function assertUrlIsSafe(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError('Invalid URL.', 400);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError('Only http/https URLs are allowed.', 400);
  }

  if (['localhost', '0.0.0.0'].includes(parsed.hostname)) {
    throw new AppError('That URL is not allowed.', 400);
  }

  try {
    const { address } = await dns.lookup(parsed.hostname);
    if (PRIVATE_IP_RANGES.some((pattern) => pattern.test(address))) {
      throw new AppError('That URL is not allowed.', 400);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Could not resolve that URL.', 400);
  }

  return parsed;
}

// @desc    Fetch Open Graph preview data (title/description/image) for a URL
//          shared in a message — done server-side to avoid CORS issues and
//          to keep the requesting user's IP hidden from the target site.
// @route   GET /api/v1/link-preview?url=https://example.com
// @access  Private
exports.getLinkPreview = catchAsync(async (req, res, next) => {
  const { url } = req.query;
  if (!url) return next(new AppError('A url query parameter is required.', 400));

  await assertUrlIsSafe(url);

  try {
    const { result } = await ogs({ url, timeout: 5000 });

    res.status(200).json({
      status: 'success',
      data: {
        url,
        title: result.ogTitle || result.twitterTitle || null,
        description: result.ogDescription || result.twitterDescription || null,
        image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || null,
        siteName: result.ogSiteName || parsedHostname(url),
      },
    });
  } catch (err) {
    logger.warn('Link preview fetch failed', { url, message: err.message });
    // Not a hard failure — the message still sends fine without a preview
    res.status(200).json({ status: 'success', data: null });
  }
});

function parsedHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
