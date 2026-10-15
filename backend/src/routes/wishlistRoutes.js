const express = require('express');
const router = express.Router();

const { requireAuth } = require('../services/integration/auth.adapter');
const {
  getWishlist,
  getWishlistIds,
  addToWishlist,
  removeFromWishlist,
  checkWishlistStatus
} = require('../controllers/wishlistController');

// All wishlist operations strictly require authentication and user-scoping
router.get('/', requireAuth, getWishlist);
router.get('/ids', requireAuth, getWishlistIds);
router.get('/check/:listingId', requireAuth, checkWishlistStatus);
router.post('/', requireAuth, addToWishlist);
router.delete('/:listingId', requireAuth, removeFromWishlist);

module.exports = router;
