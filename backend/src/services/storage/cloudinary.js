const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const save = (buffer, { listingId, filename }) => {
  return new Promise((resolve, reject) => {
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
          width: result.width,
          height: result.height,
        });
      }
    );
    uploadStream.end(buffer);
  });
};

const remove = async (key) => {
  try {
    await cloudinary.uploader.destroy(key);
  } catch (e) {
    console.error('Cloudinary remove error:', e);
  }
};

module.exports = { save, remove };
