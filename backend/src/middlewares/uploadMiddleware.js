const multer = require('multer');

// Memory storage to process buffers with Sharp or Cloudinary directly
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid MIME type. Only JPEG, PNG, and WebP are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 6,
  },
  fileFilter,
});

module.exports = upload;
