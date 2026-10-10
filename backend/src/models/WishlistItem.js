const mongoose = require('mongoose');

// FR-4.3: User wishlists / saved listings
// OpenAPI: /wishlist
const wishlistItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
// Prevents duplicate wishlist entries for the same user & listing
wishlistItemSchema.index({ userId: 1, listingId: 1 }, { unique: true });

module.exports = mongoose.model('WishlistItem', wishlistItemSchema);
