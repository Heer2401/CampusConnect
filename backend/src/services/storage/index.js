const localAdapter = require('./local');
const cloudinaryAdapter = require('./cloudinary');

const isCloudinary = process.env.IMAGE_STORAGE === 'cloudinary';

module.exports = isCloudinary ? cloudinaryAdapter : localAdapter;
