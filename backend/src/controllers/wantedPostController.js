const mongoose = require('mongoose');
const Category = require('../models/Category');
const WantedPost = require('../models/WantedPost');

const listWantedPosts = async (req, res, next) => {
  try {
    const filter = { status: 'open' };
    if (req.query.mine === 'true') filter.userId = req.user._id || req.user.id;
    const posts = await WantedPost.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('categoryId', 'name slug')
      .populate('userId', 'profile.name')
      .lean();
    res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

const createWantedPost = async (req, res, next) => {
  try {
    const { title, description, categoryId, budgetMax } = req.body;
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 160) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Title must be between 3 and 160 characters' } });
    }
    if (typeof description !== 'string' || description.trim().length < 5 || description.trim().length > 2000) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Description must be between 5 and 2000 characters' } });
    }
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'A valid category is required' } });
    }
    const category = await Category.findOne({ _id: categoryId, isActive: true });
    if (!category) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Category not found or inactive' } });
    }
    const parsedBudget = budgetMax === '' || budgetMax === null || budgetMax === undefined ? null : Number(budgetMax);
    if (parsedBudget !== null && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Maximum budget must be a non-negative number' } });
    }

    const post = await WantedPost.create({
      userId: req.user._id || req.user.id,
      title: title.trim(),
      description: description.trim(),
      categoryId: category._id,
      budgetMax: parsedBudget,
    });
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

const closeWantedPost = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid wanted post ID' } });
    }
    const post = await WantedPost.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id || req.user.id, status: 'open' },
      { status: 'closed' },
      { new: true }
    );
    if (!post) {
      return res.status(404).json({ success: false, error: { code: 404, message: 'Open wanted post not found' } });
    }
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

module.exports = { listWantedPosts, createWantedPost, closeWantedPost };
