const mongoose = require('mongoose');
const WishlistItem = require('../models/WishlistItem');
const Listing = require('../models/Listing');

/**
 * GET /api/v1/wishlist
 * Get all wishlisted items for the authenticated user
 */
const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    const items = await WishlistItem.find({ userId })
      .populate({
        path: 'listingId',
        select: 'title description category listingType price rentalRate rentalPeriod condition images status isDeleted owner createdAt',
        populate: [
          { path: 'category', select: 'name slug icon' },
          { path: 'owner', select: 'name avatar' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter or annotate deleted/missing listings gracefully
    const validItems = items.map(item => {
      const listing = item.listingId;
      const isUnavailable = !listing || listing.isDeleted || listing.status !== 'active';
      return {
        _id: item._id,
        wishlistId: item._id,
        listing: listing || null,
        isUnavailable,
        createdAt: item.createdAt
      };
    });

    res.json({
      success: true,
      data: validItems,
      meta: {
        total: validItems.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/wishlist/ids
 * Returns array of listingIds wishlisted by the current user
 */
const getWishlistIds = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const items = await WishlistItem.find({ userId }).select('listingId').lean();
    const ids = items.map(i => i.listingId ? i.listingId.toString() : null).filter(Boolean);

    res.json({
      success: true,
      data: ids
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/wishlist
 * Add a listing to the current user's wishlist
 */
const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { listingId } = req.body;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'A valid listingId is required' }
      });
    }

    const listing = await Listing.findById(listingId);
    if (!listing || listing.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: 'Listing not found or has been removed' }
      });
    }

    // Check if already in wishlist (prevent duplicate)
    const existing = await WishlistItem.findOne({ userId, listingId });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Listing is already in your wishlist',
        data: existing
      });
    }

    const wishlistItem = new WishlistItem({
      userId,
      listingId
    });

    await wishlistItem.save();

    res.status(201).json({
      success: true,
      message: 'Listing added to wishlist',
      data: wishlistItem
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error safety fallback
      return res.status(200).json({
        success: true,
        message: 'Listing is already in your wishlist'
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/v1/wishlist/:listingId
 * Remove a listing from the current user's wishlist
 */
const removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { listingId } = req.params;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'A valid listingId is required' }
      });
    }

    const removed = await WishlistItem.findOneAndDelete({
      userId,
      listingId
    });

    if (!removed) {
      // Also try finding by WishlistItem._id just in case frontend passed wishlist entry id
      const removedById = await WishlistItem.findOneAndDelete({
        _id: listingId,
        userId
      });

      if (!removedById) {
        return res.status(404).json({
          success: false,
          error: { code: 404, message: 'Item not found in your wishlist' }
        });
      }
    }

    res.json({
      success: true,
      message: 'Listing removed from wishlist',
      data: { listingId }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/wishlist/check/:listingId
 * Check if a specific listing is in user's wishlist
 */
const checkWishlistStatus = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { listingId } = req.params;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'A valid listingId is required' }
      });
    }

    const item = await WishlistItem.findOne({ userId, listingId });

    res.json({
      success: true,
      data: {
        isWishlisted: Boolean(item)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  getWishlistIds,
  addToWishlist,
  removeFromWishlist,
  checkWishlistStatus
};
