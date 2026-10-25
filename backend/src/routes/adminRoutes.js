const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { adminOnly } = require('../middlewares/adminMiddleware');
const {
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
} = require('../controllers/adminController');

// ----------------------------------------
// Listing Moderation Routes (FR-6.1)
// ----------------------------------------
router.get('/listings/pending', protect, adminOnly, getPendingListings);
router.patch('/listings/:id/approve', protect, adminOnly, approveListing);
router.patch('/listings/:id/reject', protect, adminOnly, rejectListing);

// ----------------------------------------
// User Management Routes (FR-6.2)
// ----------------------------------------
router.get('/users', protect, adminOnly, getUsers);
router.get('/users/:id', protect, adminOnly, getUserDetails);
router.patch('/users/:id/status', protect, adminOnly, updateUserStatus);

// ----------------------------------------
// Category Management Routes (FR-6.3)
// ----------------------------------------
router.get('/categories', protect, adminOnly, getCategories);
router.post('/categories', protect, adminOnly, createCategory);
router.put('/categories/:id', protect, adminOnly, updateCategory);
router.delete('/categories/:id', protect, adminOnly, deleteCategory);

// ----------------------------------------
// Dispute & Report Routes (FR-6.4, US-14)
// ----------------------------------------
router.post('/disputes', protect, createDispute);
router.get('/disputes', protect, adminOnly, getDisputes);
router.get('/disputes/:id', protect, adminOnly, getDisputeById);
router.patch('/disputes/:id/resolve', protect, adminOnly, resolveDispute);

// ----------------------------------------
// Platform Analytics & Trends (FR-6.5)
// ----------------------------------------
router.get('/analytics/overview', protect, adminOnly, getDashboardAnalytics);

// ----------------------------------------
// System Audit Log (FR-7.1, NFR-9.1)
// ----------------------------------------
router.get('/audit-logs', protect, adminOnly, getAuditLogs);

module.exports = router;
