const localAdapter = require('./local');
const isCloudinary = process.env.IMAGE_STORAGE === 'cloudinary';

module.exports = isCloudinary ? require('./cloudinary') : localAdapter;
