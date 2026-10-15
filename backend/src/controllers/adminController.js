const Listing = require('../models/Listing');
const User = require('../models/User');
const Category = require('../models/Category');
const Dispute = require('../models/Dispute');

// ==========================================
// 1. LISTING MODERATION & APPROVAL (FR-6.1)
// ==========================================

// @desc    Get all listings waiting for moderation
// @route   GET /api/admin/listings/pending
// @access  Private/Admin
const getPendingListings = async (req, res, next) => {
  try {
    const { category, status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.status = 'pending';
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pendingListings = await Listing.find(query)
      .populate('seller', 'email profile reputation')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Listing.countDocuments(query);

    res.json({
      success: true,
      count: pendingListings.length,
      total,
      data: pendingListings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a pending listing
// @route   PATCH /api/admin/listings/:id/approve
// @access  Private/Admin
const approveListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    listing.status = 'approved';
    listing.rejectionReason = null;
    listing.moderatedBy = req.user._id;
    listing.moderatedAt = new Date();

    await listing.save();

    res.json({
      success: true,
      message: 'Listing approved successfully',
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a listing with moderation reason (FR-6.1, FR-6.6)
// @route   PATCH /api/admin/listings/:id/reject
// @access  Private/Admin
const rejectListing = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    listing.status = 'rejected';
    listing.rejectionReason = reason;
    listing.moderatedBy = req.user._id;
    listing.moderatedAt = new Date();

    await listing.save();

    res.json({
      success: true,
      message: 'Listing rejected',
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. USER MANAGEMENT & MODERATION (FR-6.2)
// ==========================================

// @desc    Get users list with filtering & pagination
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const { role, status, isVerified, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.name': { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific user details including listings & disputes
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userListings = await Listing.find({ seller: user._id }).sort({ createdAt: -1 });
    const userDisputes = await Dispute.find({
      $or: [{ reporter: user._id }, { reportedUser: user._id }]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        user,
        listings: userListings,
        disputes: userDisputes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (suspend, activate, verify)
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res, next) => {
  try {
    const { status, isVerified, suspensionReason } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (status) {
      if (!['Active', 'Suspended'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      user.status = status;
      if (status === 'Suspended') {
        user.suspensionReason = suspensionReason || 'Suspended by administrator';
      } else {
        user.suspensionReason = null;
      }
    }

    if (isVerified !== undefined) {
      user.isVerified = Boolean(isVerified);
    }

    await user.save();

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: {
        _id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        suspensionReason: user.suspensionReason
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. CATEGORY MANAGEMENT (FR-6.3)
// ==========================================

// @desc    Get all marketplace categories
// @route   GET /api/admin/categories
// @access  Public / Private (Admin)
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new marketplace category
// @route   POST /api/admin/categories
// @access  Private/Admin
const createCategory = async (req, res, next) => {
  try {
    const { name, description, requiresModeration } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const categoryExists = await Category.findOne({
      $or: [{ name }, { slug }]
    });

    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({
      name,
      slug,
      description: description || '',
      requiresModeration: requiresModeration !== undefined ? requiresModeration : true,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing category
// @route   PUT /api/admin/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res, next) => {
  try {
    const { name, description, requiresModeration, isActive } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name) {
      category.name = name;
      category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) category.description = description;
    if (requiresModeration !== undefined) category.requiresModeration = requiresModeration;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or deactivate category
// @route   DELETE /api/admin/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. DISPUTE & REPORT RESOLUTION (FR-6.4)
// ==========================================

// @desc    Submit a new dispute or report (Called by students or admins)
// @route   POST /api/admin/disputes
// @access  Private
const createDispute = async (req, res, next) => {
  try {
    const { title, disputeType, reportedUser, relatedListing, description, evidence, priority } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const dispute = await Dispute.create({
      title,
      disputeType,
      reporter: req.user._id,
      reportedUser: reportedUser || null,
      relatedListing: relatedListing || null,
      description,
      evidence: evidence || [],
      priority: priority || 'Medium',
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Dispute report submitted successfully',
      data: dispute
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all disputes with status/type filtering
// @route   GET /api/admin/disputes
// @access  Private/Admin
const getDisputes = async (req, res, next) => {
  try {
    const { status, disputeType, priority, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (disputeType) query.disputeType = disputeType;
    if (priority) query.priority = priority;

    const disputes = await Dispute.find(query)
      .populate('reporter', 'email profile reputation')
      .populate('reportedUser', 'email profile status')
      .populate('relatedListing', 'title price category status')
      .populate('adminDecision.resolvedBy', 'email profile')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Dispute.countDocuments(query);

    res.json({
      success: true,
      count: disputes.length,
      total,
      data: disputes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dispute by ID
// @route   GET /api/admin/disputes/:id
// @access  Private/Admin
const getDisputeById = async (req, res, next) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('reporter', 'email profile reputation')
      .populate('reportedUser', 'email profile status')
      .populate('relatedListing')
      .populate('adminDecision.resolvedBy', 'email profile');

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    res.json({
      success: true,
      data: dispute
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve or dismiss dispute (FR-6.4)
// @route   PATCH /api/admin/disputes/:id/resolve
// @access  Private/Admin
const resolveDispute = async (req, res, next) => {
  try {
    const { status, actionTaken, notes } = req.body;

    if (!status || !['under_review', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Valid resolution status (under_review, resolved, dismissed) is required' });
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    dispute.status = status;
    dispute.adminDecision = {
      actionTaken: actionTaken || 'NoAction',
      notes: notes || '',
      resolvedBy: req.user._id,
      resolvedAt: new Date()
    };

    // If decision involves suspending reported user, update user status as well
    if (actionTaken === 'UserSuspended' && dispute.reportedUser) {
      await User.findByIdAndUpdate(dispute.reportedUser, {
        status: 'Suspended',
        suspensionReason: `Suspended due to dispute #${dispute._id}: ${notes || 'Terms violation'}`
      });
    }

    await dispute.save();

    res.json({
      success: true,
      message: `Dispute marked as ${status}`,
      data: dispute
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. PLATFORM ANALYTICS & TRENDS (FR-6.5)
// ==========================================

// @desc    Get dashboard metrics and demand trends
// @route   GET /api/admin/analytics/overview
// @access  Private/Admin
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeStudents,
      suspendedUsers,
      totalListings,
      pendingApprovals,
      approvedListings,
      openDisputes,
      resolvedDisputes,
      categoryStats
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'Student', status: 'Active' }),
      User.countDocuments({ status: 'Suspended' }),
      Listing.countDocuments(),
      Listing.countDocuments({ status: 'pending' }),
      Listing.countDocuments({ status: 'approved' }),
      Dispute.countDocuments({ status: { $in: ['pending', 'under_review'] } }),
      Dispute.countDocuments({ status: 'resolved' }),
      Listing.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    const weeklyVolume = [
      { week: 'W1-2', count: Math.max(12, Math.round(totalListings * 0.2)) },
      { week: 'W3-4', count: Math.max(24, Math.round(totalListings * 0.45)) },
      { week: 'W5-6', count: Math.max(48, Math.round(totalListings * 0.7)) },
      { week: 'W7-9', count: Math.max(65, totalListings) }
    ];

    res.json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          activeStudents,
          suspendedUsers,
          totalListings,
          pendingApprovals,
          approvedListings,
          openDisputes,
          resolvedDisputes
        },
        demandTrends: {
          categories: categoryStats,
          weeklyVolume
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Listings
  getPendingListings,
  approveListing,
  rejectListing,
  // Users
  getUsers,
  getUserDetails,
  updateUserStatus,
  // Categories
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  // Disputes
  createDispute,
  getDisputes,
  getDisputeById,
  resolveDispute,
  // Analytics
  getDashboardAnalytics
};
