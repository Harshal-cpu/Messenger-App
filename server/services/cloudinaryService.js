const cloudinary = require('../config/cloudinary');

/**
 * Uploads a buffer (from multer memoryStorage) to Cloudinary via an
 * upload_stream, avoiding writing temp files to disk.
 *
 * @param {Buffer} buffer
 * @param {{folder: string, resourceType?: 'image'|'video'|'raw'|'auto'}} options
 * @returns {Promise<{url: string, publicId: string, bytes: number, format: string}>}
 */
const uploadBuffer = (buffer, { folder, resourceType = 'auto' }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
        });
      }
    );
    stream.end(buffer);
  });

/**
 * Deletes an asset from Cloudinary by its public id.
 */
const deleteAsset = (publicId, resourceType = 'image') =>
  cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

module.exports = { uploadBuffer, deleteAsset };
