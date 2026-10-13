const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const storage = require('../services/storage');

const checkMagicBytes = (buffer, mimetype) => {
  const header = buffer.toString('hex', 0, 4);
  switch (mimetype) {
    case 'image/jpeg': return header.startsWith('ffd8');
    case 'image/png': return header.startsWith('89504e47');
    case 'image/webp': return header.startsWith('52494646'); // RIFF
    default: return false;
  }
};

const uploadImages = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid ID' } });
    }

    const listing = await Listing.findOne({ _id: req.params.id, isDeleted: false });
    if (!listing) return res.status(404).json({ success: false, error: { code: 404, message: 'Listing not found' } });

    const currentUserId = (req.user._id || req.user.id)?.toString();
    if (listing.owner.toString() !== currentUserId) {
      return res.status(403).json({ success: false, error: { code: 403, message: 'Forbidden' } });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'No images uploaded' } });
    }

    if (listing.images.length + req.files.length > 6) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Maximum 6 images allowed per listing' } });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      if (!checkMagicBytes(file.buffer, file.mimetype)) {
        return res.status(415).json({ success: false, error: { code: 415, message: 'Invalid file signature' } });
      }

      const isPrimary = listing.images.length === 0 && uploadedImages.length === 0;
      const order = listing.images.length + uploadedImages.length;

      const savedData = await storage.save(file.buffer, {
        listingId: listing._id,
        filename: file.originalname,
        mimeType: file.mimetype
      });

      uploadedImages.push({
        ...savedData,
        isPrimary,
        order
      });
    }

    listing.images.push(...uploadedImages);
    await listing.save();

    res.status(201).json({ success: true, data: listing.images });
  } catch (error) {
    next(error);
  }
};

const deleteImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid ID' } });
    }

    const listing = await Listing.findOne({ _id: id, isDeleted: false });
    if (!listing) return res.status(404).json({ success: false, error: { code: 404, message: 'Listing not found' } });

    const currentUserId = (req.user._id || req.user.id)?.toString();
    if (listing.owner.toString() !== currentUserId) {
      return res.status(403).json({ success: false, error: { code: 403, message: 'Forbidden' } });
    }

    const imageIndex = listing.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({ success: false, error: { code: 404, message: 'Image not found' } });
    }

    const [removedImage] = listing.images.splice(imageIndex, 1);
    await storage.remove(removedImage.publicId || removedImage.key);

    if (removedImage.isPrimary && listing.images.length > 0) {
      listing.images[0].isPrimary = true;
    }

    await listing.save();
    res.json({ success: true, data: listing.images });
  } catch (error) {
    next(error);
  }
};

const reorderImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid ID' } });
    }

    const { order, primaryImageId } = req.body; // order is array of imageIds
    const listing = await Listing.findOne({ _id: id, isDeleted: false });
    if (!listing) return res.status(404).json({ success: false, error: { code: 404, message: 'Listing not found' } });

    const currentUserId = (req.user._id || req.user.id)?.toString();
    if (listing.owner.toString() !== currentUserId) {
      return res.status(403).json({ success: false, error: { code: 403, message: 'Forbidden' } });
    }

    if (order && Array.isArray(order)) {
      listing.images.forEach(img => {
        const index = order.indexOf(img._id.toString());
        if (index !== -1) {
          img.order = index;
        }
      });
      // Sort array by new order
      listing.images.sort((a, b) => a.order - b.order);
    }

    if (primaryImageId) {
      listing.images.forEach(img => {
        img.isPrimary = img._id.toString() === primaryImageId;
      });
    }

    await listing.save();
    res.json({ success: true, data: listing.images });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImages,
  deleteImage,
  reorderImages
};
