const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const SavedSearch = require('../models/SavedSearch');

/**
 * GET /api/v1/search
 * Search listings with multi-keyword query, filters, sorting, and pagination.
 */
const searchListings = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 12), 50);
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };

    // Availability / Status filter: default to 'active' unless specified
    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = { $in: ['active', 'approved'] };
    }

    // Category filter (by ObjectId or slug)
    if (req.query.category) {
      if (mongoose.Types.ObjectId.isValid(req.query.category)) {
        filter.category = req.query.category;
      } else {
        const cat = await Category.findOne({ slug: req.query.category });
        if (cat) {
          filter.category = cat._id;
        } else {
          // If category slug not found, return empty results early
          return res.json({
            success: true,
            data: [],
            meta: { page, limit, total: 0, totalPages: 0 }
          });
        }
      }
    }

    // Listing type filter
    if (req.query.listingType) {
      filter.listingType = req.query.listingType;
    }

    // Condition filter
    if (req.query.condition) {
      filter.condition = req.query.condition;
    }

    // Price range filter
    const minPrice = req.query.minPrice !== undefined && req.query.minPrice !== '' ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice !== undefined && req.query.maxPrice !== '' ? Number(req.query.maxPrice) : null;

    if (minPrice !== null || maxPrice !== null) {
      // Support matching price for sell or rentalRate for rent
      const priceConditions = [];
      const sellPriceCond = {};
      const rentRateCond = {};

      if (minPrice !== null && !isNaN(minPrice)) {
        sellPriceCond.$gte = minPrice;
        rentRateCond.$gte = minPrice;
      }
      if (maxPrice !== null && !isNaN(maxPrice)) {
        sellPriceCond.$lte = maxPrice;
        rentRateCond.$lte = maxPrice;
      }

      priceConditions.push({ price: sellPriceCond });
      priceConditions.push({ rentalRate: rentRateCond });
      if (minPrice === 0 || minPrice === null) {
        priceConditions.push({ listingType: 'giveaway' });
      }

      filter.$and = filter.$and || [];
      filter.$and.push({ $or: priceConditions });
    }

    // Keyword search (q)
    if (req.query.q && req.query.q.trim()) {
      const q = req.query.q.trim();
      // Tokenize terms for multi-word fuzzy matching
      const terms = q.split(/\s+/).filter(Boolean);
      const termConditions = terms.map(term => {
        const regex = new RegExp(term, 'i');
        return {
          $or: [
            { title: regex },
            { description: regex },
            { tags: { $in: [regex] } },
            { pickupLocation: regex }
          ]
        };
      });

      filter.$and = filter.$and || [];
      // All search terms must match somewhere across title/description/tags
      filter.$and.push({ $and: termConditions });
    }

    // Sorting
    let sort = { createdAt: -1 };
    switch (req.query.sort) {
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'price_asc':
        sort = { price: 1, rentalRate: 1 };
        break;
      case 'price_desc':
        sort = { price: -1, rentalRate: -1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: -1 };
        break;
    }

    const [total, listings] = await Promise.all([
      Listing.countDocuments(filter),
      Listing.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug icon')
        .populate('owner', 'name avatar')
        .lean()
    ]);

    res.json({
      success: true,
      data: listings,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/search/saved
 * Get saved searches for authenticated user
 */
const getSavedSearches = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const saved = await SavedSearch.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/search/saved
 * Save search criteria with a label
 */
const saveSearch = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, filters, alertEnabled } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'Saved search name is required' }
      });
    }

    const saved = new SavedSearch({
      userId,
      name: name.trim(),
      filters: filters || {},
      alertEnabled: alertEnabled !== undefined ? Boolean(alertEnabled) : true
    });

    await saved.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/search/saved/:id
 * Delete a saved search
 */
const deleteSavedSearch = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const saved = await SavedSearch.findOneAndDelete({ _id: req.params.id, userId });

    if (!saved) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: 'Saved search not found' }
      });
    }

    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchListings,
  getSavedSearches,
  saveSearch,
  deleteSavedSearch
};
