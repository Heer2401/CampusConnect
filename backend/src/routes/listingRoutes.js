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

router.post('/', requireAuth, createListing);
router.get('/', getListings);
router.get('/mine', requireAuth, getMyListings);
router.get('/:id', optionalAuth, getListingById);
router.patch('/:id', requireAuth, updateListing);
router.delete('/:id', requireAuth, deleteListing);

module.exports = router;
