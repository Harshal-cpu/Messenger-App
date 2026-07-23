const sharp = require('sharp');
const { encode } = require('blurhash');
const logger = require('../utils/logger');

/**
 * Generates a blurhash string (and the image's actual dimensions) from an
 * image buffer. Blurhash encodes a tiny, blurred version of an image as a
 * ~20-30 character string that decodes instantly client-side — used as a
 * placeholder while the full-resolution image loads from Cloudinary,
 * instead of a blank space or generic skeleton.
 *
 * Returns null on failure (e.g. corrupt image) rather than throwing —
 * this is a nice-to-have visual enhancement, never worth blocking an
 * upload over.
 */
async function generateBlurhash(buffer) {
  try {
    const { data, info } = await sharp(buffer)
      .resize(32, 32, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);

    const metadata = await sharp(buffer).metadata();

    return { blurhash, width: metadata.width, height: metadata.height };
  } catch (err) {
    logger.error('Blurhash generation failed', { message: err.message });
    return null;
  }
}

module.exports = { generateBlurhash };
