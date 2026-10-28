const multer = require('multer');

const allowedTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/bmp',
]);

const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new Error('Upload a PDF, JPEG, PNG, WebP, TIFF, or BMP document.'));
    }
    callback(null, true);
  },
}).single('file');

module.exports = (req, res, next) => {
  uploadSingle(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: { code: 413, message: 'Document exceeds the 10 MB upload limit' } });
    }
    return res.status(415).json({ success: false, error: { code: 415, message: error.message } });
  });
};
