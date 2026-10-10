/**
 * Charmi Bhayani (202512028) — Rental & Transaction Management Lead
 * rentalRoutes.js
 */

const express = require('express');
const {
  createRental,
  getMyRentals,
  getRentalById,
  updateRentalStatus,
  verifyHandover,
  completeRental,
  getRentalQR,
} = require('../controllers/rentalController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All rental routes require authentication
router.use(protect);

// POST   /api/rentals              — Create rental request
router.post('/', createRental);

// GET    /api/rentals/my-rentals   — Current user's rentals
router.get('/my-rentals', getMyRentals);

// GET    /api/rentals/:id          — Rental details
router.get('/:id', getRentalById);

// GET    /api/rentals/:id/qr       — Get QR code (owner only)
router.get('/:id/qr', getRentalQR);

// PATCH  /api/rentals/:id/status   — Owner approve/reject, renter cancel
router.patch('/:id/status', updateRentalStatus);

// POST   /api/rentals/:id/handover — QR handover verification
router.post('/:id/handover', verifyHandover);

// POST   /api/rentals/:id/return   — Record item return & complete
router.post('/:id/return', completeRental);

module.exports = router;
