const mongoose = require('mongoose');
const { getListingSuggestions, estimateListingPrice } = require('../services/integration/ai.hook');
const Category = require('../models/Category');
const Listing = require('../models/Listing');

const suggestListing = async (req, res, next) => {
  try {
    const { description, nameOrBrand, brand, name, age, condition } = req.body;
    const suggestion = await getListingSuggestions({
      file: req.file,
      description: description || '',
      nameOrBrand: nameOrBrand || brand || name || '',
      age: age || '',
      condition: condition || '',
    });

    // Auto-match category with active MongoDB Category if database is connected
    if (mongoose.connection.readyState === 1 && suggestion && suggestion.category) {
      try {
        const catPattern = new RegExp(`^${suggestion.category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const matchedCategory = await Category.findOne({
          $or: [{ name: catPattern }, { slug: catPattern }],
          isActive: true,
        });
        if (matchedCategory) {
          suggestion.categoryId = matchedCategory._id;
          suggestion.categoryName = matchedCategory.name;
        }
      } catch {
        // Fallback gracefully without breaking suggestion
      }
    }

    res.json({ success: true, data: suggestion });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status || 503).json({
        success: false,
        error: {
          code: error.response.status || 503,
          message: error.response.data?.detail || 'AI suggestion service is unavailable',
        },
      });
    }
    if (error.message === 'A listing image is required') {
      return res.status(400).json({ success: false, error: { code: 400, message: error.message } });
    }
    next(error);
  }
};

const getPriceEstimate = async (req, res, next) => {
  try {
    const { title, category: categoryId, condition = 'good' } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.length > 160) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'A title between 1 and 160 characters is required' } });
    }
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'A valid category ID is required' } });
    }

    const category = await Category.findOne({ _id: categoryId, isActive: true });
    if (!category) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Category not found or inactive' } });
    }

    const ownerId = req.user._id || req.user.id;
    const comparableListings = await Listing.find({
      category: category._id,
      listingType: 'sell',
      status: { $in: ['active', 'approved'] },
      isDeleted: false,
      price: { $gt: 0 },
      owner: { $ne: ownerId },
    })
      .select('title price condition')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const estimate = await estimateListingPrice({
      title: title.trim(),
      category: category.name,
      condition,
      comparableItems: comparableListings.map((listing) => ({
        title: listing.title,
        category: category.name,
        price: listing.price,
        condition: listing.condition || 'good',
      })),
    });

    return res.json({ success: true, data: estimate });
  } catch (error) {
    if (error.response || error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: { code: 503, message: 'Price estimation is temporarily unavailable. You can enter a price manually.' },
      });
    }
    return next(error);
  }
};

module.exports = { suggestListing, getPriceEstimate };
