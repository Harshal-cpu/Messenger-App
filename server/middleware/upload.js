const multer = require('multer');
const AppError = require('../utils/AppError');

// Store files in memory as buffers; we stream them straight to Cloudinary
// rather than writing to disk first.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
  ],
};

const ALL_ALLOWED = Object.values(ALLOWED_MIME_TYPES).flat();

const fileFilter = (req, file, cb) => {
  if (ALL_ALLOWED.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new AppError(`Unsupported file type: ${file.mimetype}`, 400), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
});

const getMediaType = (mimetype) => {
  if (ALLOWED_MIME_TYPES.image.includes(mimetype)) return 'image';
  if (ALLOWED_MIME_TYPES.video.includes(mimetype)) return 'video';
  if (ALLOWED_MIME_TYPES.audio.includes(mimetype)) return 'audio';
  return 'document';
};

module.exports = { upload, getMediaType, ALLOWED_MIME_TYPES };
