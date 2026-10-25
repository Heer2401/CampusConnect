require('dotenv').config();
const localAdapter = require('./local');

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

// Cloudinary is active if explicitly set to 'cloudinary' OR if credentials exist and IMAGE_STORAGE is not 'local'
const isCloudinary = 
  process.env.IMAGE_STORAGE === 'cloudinary' ||
  (isCloudinaryConfigured && process.env.IMAGE_STORAGE !== 'local');

module.exports = isCloudinary ? require('./cloudinary') : localAdapter;

