const mongoose = require('mongoose');
const { getListingSuggestions } = require('../services/integration/ai.hook');
const Category = require('../models/Category');

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

module.exports = { suggestListing };
