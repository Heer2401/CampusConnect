/**
 * Dhrumil Doshi (202512088) — Authentication & User Management Lead
 * userRoutes.js
 * 
 * Endpoints:
 * GET    /api/users/me                     — Get current user profile (FR-1.4)
 * PATCH  /api/users/me                     — Update current user profile (FR-1.4)
 * GET    /api/users/me/payment-methods     — List saved payment methods (FR-1.6)
 * POST   /api/users/me/payment-methods     — Add a new payment method (FR-1.6)
 * DELETE /api/users/me/payment-methods/:id — Remove a payment method (FR-1.6)
 * PATCH  /api/users/me/payment-methods/:id/default — Set default method (FR-1.6)
 */

const express = require('express');
const {
  getMe,
  updateMe,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All user routes require authentication
router.use(protect);

router.route('/me')
  .get(getMe)
  .patch(updateMe);

router.route('/me/payment-methods')
  .get(getPaymentMethods)
  .post(addPaymentMethod);

router.route('/me/payment-methods/:id')
  .delete(deletePaymentMethod);

router.route('/me/payment-methods/:id/default')
  .patch(setDefaultPaymentMethod);

module.exports = router;
