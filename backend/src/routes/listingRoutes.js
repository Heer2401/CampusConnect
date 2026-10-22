const express = require('express');
const router = express.Router();

const { requireAuth, optionalAuth, requireRole } = require('../services/integration/auth.adapter');
const {
  createListing,
  getListings,
  getMyListings,
  getListingById,
  updateListing,
  deleteListing
} = require('../controllers/listingController');

const {
  uploadImages,
  deleteImage,
  reorderImages
} = require('../controllers/imageController');
const upload = require('../middlewares/uploadMiddleware');
const { suggestListing } = require('../controllers/aiController');

router.post('/ai-suggest', requireAuth, upload.single('image'), suggestListing);
router.post('/', requireAuth, createListing);
router.get('/', getListings);
router.get('/mine', requireAuth, getMyListings);
router.get('/:id', optionalAuth, getListingById);
router.patch('/:id', requireAuth, updateListing);
router.delete('/:id', requireAuth, deleteListing);

router.post('/:id/images', requireAuth, upload.array('images', 6), uploadImages);
router.delete('/:id/images/:imageId', requireAuth, deleteImage);
router.patch('/:id/images/order', requireAuth, reorderImages);

module.exports = router;
