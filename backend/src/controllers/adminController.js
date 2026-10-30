const Listing = require('../models/Listing');
const User = require('../models/User');
const Category = require('../models/Category');
const Dispute = require('../models/Dispute');
const AuditLog = require('../models/AuditLog');

const logAdminAction = async (req, action, targetModel, targetId, changes = null) => {
  try {
    if (!req.user?._id) return;
    await AuditLog.create({
      actorId: req.user._id,
      action,
      targetModel,
      targetId,
      changes,
      ipAddress: req.ip || req.connection?.remoteAddress || null
    });
  } catch (err) {
    console.error('AuditLog error:', err.message);
  }
};

// ==========================================
// 1. LISTING MODERATION & APPROVAL (FR-6.1)
// ==========================================

// @desc    Get all listings waiting for moderation (reported, low-rated sellers, or pending)
// @route   GET /api/admin/listings/pending
// @access  Private/Admin
const getPendingListings = async (req, res, next) => {
  try {
    const { category, status, search, queueType = 'moderation_needed', page = 1, limit = 50 } = req.query;

    // 1. Fetch all open reports/disputes referencing listings or reported sellers
    const openReports = await Dispute.find({
      status: { $in: ['pending', 'under_review'] }
    })
      .populate('reporter', 'email profile')
      .populate('reportedUser', 'email profile');

    const reportsByListingId = {};
    const directlyReportedListingIds = [];
    const reportedUserDisputes = {};
    const reportedUserIds = [];

    openReports.forEach(r => {
      const baseReport = {
        _id: r._id,
        title: r.title,
        description: r.description,
        disputeType: r.disputeType,
        reporter: r.reporter?.profile?.name || r.reporter?.email || 'Student',
        createdAt: r.createdAt
      };

      if (r.relatedListing) {
        const lid = r.relatedListing.toString();
        if (!reportsByListingId[lid]) reportsByListingId[lid] = [];
        reportsByListingId[lid].push({ ...baseReport, isItemReport: true });
        directlyReportedListingIds.push(lid);
      }

      if (r.reportedUser) {
        const uid = (r.reportedUser._id || r.reportedUser).toString();
        if (!reportedUserDisputes[uid]) reportedUserDisputes[uid] = [];
        reportedUserDisputes[uid].push({
          ...baseReport,
          isSellerReport: true,
          sellerName: r.reportedUser?.profile?.name || r.reportedUser?.email || 'Seller'
        });
        reportedUserIds.push(uid);
      }
    });

    // Find all listings owned by reported users so moderation applies when the seller is reported
    const sellerListingIds = [];
    if (reportedUserIds.length > 0) {
      const sellerListings = await Listing.find({
        $or: [{ owner: { $in: reportedUserIds } }, { seller: { $in: reportedUserIds } }],
        isDeleted: { $ne: true }
      }).select('_id owner seller');

      sellerListings.forEach(sl => {
        const lid = sl._id.toString();
        const sid = (sl.owner || sl.seller)?.toString();
        sellerListingIds.push(lid);
        if (sid && reportedUserDisputes[sid]) {
          if (!reportsByListingId[lid]) reportsByListingId[lid] = [];
          reportsByListingId[lid].push(...reportedUserDisputes[sid]);
        }
      });
    }

    const allModerationListingIds = Array.from(new Set([...directlyReportedListingIds, ...sellerListingIds]));

    // 2. Fetch users with low reputation rating (< 3.0)
    const lowRatedUsers = await User.find({
      'reputation.rating': { $gt: 0, $lt: 3.0 }
    }).select('_id reputation');
    const lowRatedUserIds = lowRatedUsers.map(u => u._id);

    // 3. Build query based on queueType
    const query = { isDeleted: { $ne: true } };

    if (queueType === 'reported') {
      query._id = { $in: allModerationListingIds.length > 0 ? allModerationListingIds : [new mongoose.Types.ObjectId()] };
    } else if (queueType === 'low_rating') {
      query.$or = [{ owner: { $in: lowRatedUserIds } }, { seller: { $in: lowRatedUserIds } }];
    } else if (queueType === 'pending_only') {
      query.status = { $in: ['pending', 'pending_approval'] };
    } else if (queueType === 'all_listings') {
      // no restriction
    } else {
      // Default: 'moderation_needed' -> Listing is reported, Seller is reported, or status is pending moderation
      if (allModerationListingIds.length > 0) {
        query.$or = [
          { _id: { $in: allModerationListingIds } },
          { status: { $in: ['pending', 'pending_approval'] } }
        ];
      } else {
        query.status = { $in: ['pending', 'pending_approval'] };
      }
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const searchCond = [{ title: searchRegex }, { description: searchRegex }];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchCond }];
        delete query.$or;
      } else {
        query.$or = searchCond;
      }
    }

    const listings = await Listing.find(query)
      .populate('owner', 'email profile reputation')
      .populate('category', 'name icon slug')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // 4. Enrich listings with reason for moderation
    const enrichedListings = listings.map(l => {
      const obj = l.toObject();
      obj.seller = obj.owner;
      const lid = l._id.toString();
      const listingReports = reportsByListingId[lid] || [];
      const sellerRating = obj.owner?.reputation?.rating ?? 0;
      const flags = [];

      if (listingReports.length > 0) {
        const itemReports = listingReports.filter(r => r.isItemReport);
        const sellerReports = listingReports.filter(r => r.isSellerReport);

        if (itemReports.length > 0) {
          flags.push({
            type: 'reported',
            label: `${itemReports.length} student report(s) on item`,
            details: itemReports
          });
        }
        if (sellerReports.length > 0) {
          flags.push({
            type: 'seller_reported',
            label: `Seller reported in ${sellerReports.length} dispute(s)`,
            details: sellerReports
          });
        }
      }

      if (sellerRating > 0 && sellerRating < 3.0) {
        flags.push({
          type: 'low_rating',
          label: `Low seller rating (${sellerRating.toFixed(1)} ★)`,
          rating: sellerRating
        });
      }

      if (l.status === 'pending' || l.status === 'pending_approval') {
        flags.push({
          type: 'pending',
          label: 'Pending moderation check'
        });
      }

      obj.moderationFlags = flags;
      obj.reports = listingReports;
      return obj;
    });

    const total = await Listing.countDocuments(query);

    res.json({
      success: true,
      count: enrichedListings.length,
      total,
      data: enrichedListings,
      summary: {
        totalFlagged: allModerationListingIds.length,
        lowRatedSellersCount: lowRatedUserIds.length
      }
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

      // Matching is triggered when a moderated listing becomes visible.
      const { matchListingToRequests } = require('../services/rentalRequestMatchingService');
      matchListingToRequests(req.app, listing._id).catch((matchError) => {
        console.error('[request matching] approval trigger failed:', matchError.message);
      });

    // Auto-dismiss open disputes/reports on this listing since it was cleared
    await Dispute.updateMany(
      { relatedListing: listing._id, status: { $in: ['pending', 'under_review'] } },
      {
        status: 'dismissed',
        adminDecision: {
          actionTaken: 'NoAction',
          notes: 'Listing cleared and approved by administrator.',
          resolvedBy: req.user._id,
          resolvedAt: new Date()
        }
      }
    );

    try {
      const { sendNotification } = require('../services/notificationService');
      const ownerId = listing.owner || listing.seller;
      if (ownerId) {
        sendNotification(req.app, {
          userId: ownerId,
          type: 'listing_approved',
          title: 'Listing Approved',
          message: `Your listing "${listing.title}" has been approved and published.`,
          relatedId: listing._id,
          relatedModel: 'Listing'
        });
      }
    } catch (e) { }

    await logAdminAction(req, 'listing.approve', 'Listing', listing._id, { title: listing.title });

    res.json({
      success: true,
      message: 'Listing approved and reports dismissed',
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject / Take down a listing with moderation reason (FR-6.1, FR-6.6)
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

    // Auto-resolve open disputes/reports on this listing as ListingRemoved
    await Dispute.updateMany(
      { relatedListing: listing._id, status: { $in: ['pending', 'under_review'] } },
      {
        status: 'resolved',
        adminDecision: {
          actionTaken: 'ListingRemoved',
          notes: reason,
          resolvedBy: req.user._id,
          resolvedAt: new Date()
        }
      }
    );

    try {
      const { sendNotification } = require('../services/notificationService');
      const ownerId = listing.owner || listing.seller;
      if (ownerId) {
        sendNotification(req.app, {
          userId: ownerId,
          type: 'listing_rejected',
          title: 'Listing Moderation Update',
          message: `Your listing "${listing.title}" was removed: ${reason}`,
          relatedId: listing._id,
          relatedModel: 'Listing'
        });
      }
    } catch (e) { }

    await logAdminAction(req, 'listing.reject', 'Listing', listing._id, { title: listing.title, reason });

    res.json({
      success: true,
      message: 'Listing rejected and removed from marketplace',
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

    try {
      const { sendNotification } = require('../services/notificationService');
      if (status === 'Suspended') {
        sendNotification(req.app, {
          userId: user._id,
          type: 'account_suspended',
          title: 'Account Status Update',
          message: `Your account has been suspended: ${user.suspensionReason}`,
          relatedId: user._id,
          relatedModel: 'User'
        });
      } else if (status === 'Active') {
        sendNotification(req.app, {
          userId: user._id,
          type: 'account_activated',
          title: 'Account Status Update',
          message: 'Your account has been reactivated. You may now participate in the campus marketplace.',
          relatedId: user._id,
          relatedModel: 'User'
        });
      } else if (isVerified !== undefined) {
        sendNotification(req.app, {
          userId: user._id,
          type: 'account_verified',
          title: 'Verification Status Update',
          message: isVerified ? 'Your university identity has been verified!' : 'Your verification status has been updated.',
          relatedId: user._id,
          relatedModel: 'User'
        });
      }
    } catch (e) { }

    await logAdminAction(req, status === 'Suspended' ? 'user.suspend' : 'user.status_update', 'User', user._id, {
      status: user.status,
      isVerified: user.isVerified,
      suspensionReason: user.suspensionReason
    });

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

    await logAdminAction(req, 'category.create', 'Category', category._id, { name: category.name, slug: category.slug });

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

    await logAdminAction(req, 'category.update', 'Category', category._id, { name: category.name, requiresModeration, isActive });

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

    await logAdminAction(req, 'category.delete', 'Category', category._id, { name: category.name });

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

    // When reported, send listing to admin moderation queue
    if (relatedListing) {
      await Listing.findByIdAndUpdate(relatedListing, { status: 'pending' });
    }

    // When seller is reported, send seller's active listings to moderation queue
    if (reportedUser) {
      await Listing.updateMany(
        { $or: [{ owner: reportedUser }, { seller: reportedUser }], status: { $in: ['active', 'approved'] } },
        { status: 'pending' }
      );
    }

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

    // If decision involves suspending reported user, update user status as well and take down listings
    if (actionTaken === 'UserSuspended' && dispute.reportedUser) {
      await User.findByIdAndUpdate(dispute.reportedUser, {
        status: 'Suspended',
        suspensionReason: `Suspended due to dispute #${dispute._id}: ${notes || 'Terms violation'}`
      });
      await Listing.updateMany(
        { $or: [{ owner: dispute.reportedUser }, { seller: dispute.reportedUser }], status: { $ne: 'rejected' } },
        { status: 'rejected', rejectionReason: `Seller suspended: ${notes || 'Terms violation'}` }
      );
    }

    // If decision involves removing the listing, update listing status as well
    if (actionTaken === 'ListingRemoved' && dispute.relatedListing) {
      await Listing.findByIdAndUpdate(dispute.relatedListing, {
        status: 'rejected',
        rejectionReason: notes || `Removed due to dispute #${dispute._id}`,
        moderatedBy: req.user._id,
        moderatedAt: new Date()
      });
    }

    // If dispute is dismissed or resolved without removing listing or suspending user, restore listing(s) to active
    if (['resolved', 'dismissed'].includes(status) && actionTaken !== 'ListingRemoved' && actionTaken !== 'UserSuspended') {
      if (dispute.relatedListing) {
        await Listing.findByIdAndUpdate(dispute.relatedListing, {
          status: 'active',
          rejectionReason: null
        });
      }
      if (dispute.reportedUser) {
        const otherOpen = await Dispute.countDocuments({
          _id: { $ne: dispute._id },
          reportedUser: dispute.reportedUser,
          status: { $in: ['pending', 'under_review'] }
        });
        if (otherOpen === 0) {
          await Listing.updateMany(
            { $or: [{ owner: dispute.reportedUser }, { seller: dispute.reportedUser }], status: 'pending' },
            { status: 'active', rejectionReason: null }
          );
        }
      }
    }

    await dispute.save();

    try {
      const { sendNotification } = require('../services/notificationService');
      if (dispute.reporter) {
        sendNotification(req.app, {
          userId: dispute.reporter,
          type: 'dispute_resolved',
          title: 'Report Resolution Update',
          message: `Your report regarding "${dispute.title}" has been updated to "${status}": ${notes || actionTaken}`,
          relatedId: dispute._id,
          relatedModel: 'Dispute'
        });
      }
      if (dispute.reportedUser && actionTaken === 'WarningIssued') {
        sendNotification(req.app, {
          userId: dispute.reportedUser,
          type: 'moderation_warning',
          title: 'Official Moderation Notice',
          message: `A dispute regarding your activity was reviewed. Notice: ${notes || 'Please adhere to campus marketplace guidelines.'}`,
          relatedId: dispute._id,
          relatedModel: 'Dispute'
        });
      }
    } catch (e) { }

    await logAdminAction(req, 'dispute.resolve', 'Dispute', dispute._id, { status, actionTaken, notes });

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
    const openReportedListingIds = await Dispute.distinct('relatedListing', {
      relatedListing: { $ne: null },
      status: { $in: ['pending', 'under_review'] }
    });

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
      Listing.countDocuments({ isDeleted: { $ne: true } }),
      Listing.countDocuments({
        $or: [
          { _id: { $in: openReportedListingIds } },
          { status: { $in: ['pending', 'pending_approval'] } }
        ],
        isDeleted: { $ne: true }
      }),
      Listing.countDocuments({ status: { $in: ['approved', 'active'] }, isDeleted: { $ne: true } }),
      Dispute.countDocuments({ status: { $in: ['pending', 'under_review'] } }),
      Dispute.countDocuments({ status: 'resolved' }),
      Listing.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryDoc'
          }
        },
        {
          $unwind: {
            path: '$categoryDoc',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            count: 1,
            name: { $ifNull: ['$categoryDoc.name', 'Others'] },
            icon: { $ifNull: ['$categoryDoc.icon', '📦'] }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);


    const weeklyVolume = await Listing.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          createdAt: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$createdAt" },
            week: { $isoWeek: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.week": 1
        }
      },
      {
        $project: {
          _id: 0,
          week: {
            $concat: [
              "W",
              { $toString: "$_id.week" },
              " ",
              { $toString: "$_id.year" }
            ]
          },
          count: 1
        }
      }
    ]);


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

// ==========================================
// 6. SYSTEM AUDIT LOG (FR-7.1, NFR-9.1)
// ==========================================

// @desc    Get system audit log entries
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, targetModel } = req.query;
    const query = {};
    if (action) query.action = action;
    if (targetModel) query.targetModel = targetModel;

    const logs = await AuditLog.find(query)
      .populate('actorId', 'email profile role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      count: logs.length,
      total,
      data: logs
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
  getDashboardAnalytics,
  // Audit Logs
  getAuditLogs
};
