const Category = require('../models/Category');
const Listing = require('../models/Listing'); // Assuming Listing exists

// GET /api/v1/categories
const getCategories = async (req, res, next) => {
  try {
    const { includeInactive, tree } = req.query;
    const filter = {};
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }

    const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();

    // Calculate listing counts
    // For each active category, how many active listings?
    const listingCounts = await Listing.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    listingCounts.forEach(c => countMap[c._id.toString()] = c.count);

    const enrichedCategories = categories.map(c => ({
      ...c,
      listingCount: countMap[c._id.toString()] || 0
    }));

    if (tree === 'true') {
      // Build tree (1 level deep)
      const parents = enrichedCategories.filter(c => !c.parent);
      const children = enrichedCategories.filter(c => c.parent);
      
      const treeData = parents.map(p => ({
        ...p,
        children: children.filter(c => c.parent.toString() === p._id.toString())
      }));
      return res.json({ success: true, data: treeData });
    }

    res.json({ success: true, data: enrichedCategories });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/categories/:idOrSlug
const getCategory = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    let query = { slug: idOrSlug };
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      query = { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] };
    }
    
    const category = await Category.findOne(query).lean();
    if (!category) {
      return res.status(404).json({ success: false, error: { code: 404, message: 'Category not found' } });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/categories (Admin only)
const createCategory = async (req, res, next) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: { code: 409, message: 'Category with this name or slug already exists' } });
    }
    next(error);
  }
};

// PATCH /api/v1/categories/:id (Admin only)
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ success: false, error: { code: 404, message: 'Category not found' } });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: { code: 409, message: 'Category with this name or slug already exists' } });
    }
    next(error);
  }
};

// DELETE /api/v1/categories/:id (Admin only)
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if referenced
    const refCount = await Listing.countDocuments({ category: id, isDeleted: { $ne: true } });
    if (refCount > 0) {
      return res.status(409).json({ success: false, error: { code: 409, message: 'Category is in use by active listings. Set isActive to false instead.' } });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ success: false, error: { code: 404, message: 'Category not found' } });
    }
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
