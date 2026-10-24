/**
 * Charmi Bhayani (202512028) — Rental & Transaction Management
 * rentalRequestRoutes.js
 */

const express = require('express');
const {
  createRentalRequest,
  getMyRentalRequests,
  getAllRentalRequests,
  cancelRentalRequest,
  notifyItemListing,
} = require('../controllers/rentalRequestController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST   /api/rental-requests        — Post a new item request
router.post('/', createRentalRequest);

// GET    /api/rental-requests/my     — My own requests
router.get('/my', getMyRentalRequests);

// GET    /api/rental-requests        — Browse all open community requests
router.get('/', getAllRentalRequests);

// POST   /api/rental-requests/:id/notify-listing — Owner offers to list item & notifies student
router.post('/:id/notify-listing', notifyItemListing);

// PATCH  /api/rental-requests/:id/cancel — Cancel own request
router.patch('/:id/cancel', cancelRentalRequest);

module.exports = router;
