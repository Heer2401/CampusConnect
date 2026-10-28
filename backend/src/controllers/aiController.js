const mongoose = require('mongoose');
const {
  getListingSuggestions,
  estimateListingPrice,
  extractUploadedDocument,
} = require('../services/integration/ai.hook');
const Category = require('../models/Category');
const Listing = require('../models/Listing');
const { matchListingToWantedPosts } = require('../services/wantedPostMatchingService');
const { findDocumentDuplicate } = require('../services/documentDuplicateService');

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

const checkStudyDocument = async (req, res, next) => {
  try {
    const { category: categoryId } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Choose a PDF or image document to check' } });
    }
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'A valid category ID is required' } });
    }
    const category = await Category.findOne({ _id: categoryId, isActive: true });
    if (!category) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Category not found or inactive' } });
    }

    const extracted = await extractUploadedDocument({ file: req.file });
    const result = await findDocumentDuplicate({
      documentText: extracted.extracted_text,
      categoryId: category._id,
    });
    res.json({
      success: true,
      data: {
        ...extracted,
        ...result,
      },
    });
  } catch (error) {
    if (error.response || error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: { code: 503, message: 'OCR is temporarily unavailable. Save a draft and try again before publishing.' },
      });
    }
    next(error);
  }
};

const evaluateListingWantedMatches = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid listing ID' } });
    }
    const listing = await Listing.findById(req.params.id).populate('category', 'name').lean();
    if (!listing || listing.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 404, message: 'Listing not found' } });
    }
    const userId = (req.user._id || req.user.id).toString();
    const ownerId = (listing.owner?._id || listing.owner).toString();
    if (userId !== ownerId && !['admin', 'Admin', 'Administrator'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 403, message: 'Only the listing owner can view its matches' } });
    }
    const result = await matchListingToWantedPosts(req.app, listing);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.response || error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: { code: 503, message: 'Wanted-post matching is temporarily unavailable' },
      });
    }
    next(error);
  }
};

module.exports = {
  suggestListing,
  getPriceEstimate,
  checkStudyDocument,
  evaluateListingWantedMatches,
};
