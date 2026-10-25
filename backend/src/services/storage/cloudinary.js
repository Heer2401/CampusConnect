require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const configureCloudinary = () => {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true,
    });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
};

configureCloudinary();

const isConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
};

const save = (buffer, { listingId, filename, mimeType }) => {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return reject(
        new Error(
          'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in backend/.env'
        )
      );
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `campusconnect/listings/${listingId}`,
        format: 'webp',
        transformation: [
          { width: 1600, crop: 'limit' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          // Cloudinary allows on-the-fly thumbnails by changing the URL parameters
          thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_400,c_limit/'),
          key: result.public_id,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
    uploadStream.end(buffer);
  });
};

const remove = async (key) => {
  if (!key) return;
  configureCloudinary();
  try {
    const result = await cloudinary.uploader.destroy(key);
    return result;
  } catch (e) {
    console.error('Cloudinary remove error:', e);
  }
};

const ping = async () => {
  configureCloudinary();
  return cloudinary.api.ping();
};

module.exports = { save, remove, ping, isConfigured, cloudinary };
