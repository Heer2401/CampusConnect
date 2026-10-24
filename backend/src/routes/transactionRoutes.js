/**
 * Charmi Bhayani (202512028) — Rental & Transaction Management Lead
 * transactionRoutes.js
 */

const express = require('express');
const {
  createTransaction,
  getMyTransactions,
  getTransactionById,
  confirmTransaction,
  generateHandoverPin,
  verifyHandoverPin,
  cancelTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All transaction routes require authentication
router.use(protect);

// POST   /api/transactions              — Initiate transaction
router.post('/', createTransaction);

// GET    /api/transactions/my           — Current user's transactions
router.get('/my', getMyTransactions);

// GET    /api/transactions/:id          — Transaction details
router.get('/:id', getTransactionById);

// PATCH  /api/transactions/:id/confirm  — Confirm receipt
router.patch('/:id/confirm', confirmTransaction);

// POST   /api/transactions/:id/generate-pin — Seller generates 6-digit meetup PIN
router.post('/:id/generate-pin', generateHandoverPin);

// POST   /api/transactions/:id/verify-pin   — Buyer enters 6-digit meetup PIN
router.post('/:id/verify-pin', verifyHandoverPin);

// PATCH  /api/transactions/:id/cancel   — Cancel transaction
router.patch('/:id/cancel', cancelTransaction);

module.exports = router;
