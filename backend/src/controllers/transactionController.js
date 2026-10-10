/**
 * Charmi Bhayani (202512028) — Rental & Transaction Management Lead
 * transactionController.js
 *
 * Covers: FR-2.7, FR-1.6, AC-8
 *  POST   /api/transactions              — Initiate a buy/exchange/giveaway transaction
 *  GET    /api/transactions/my           — Current user's transactions
 *  GET    /api/transactions/:id          — Transaction details
 *  PATCH  /api/transactions/:id/confirm  — Buyer or seller confirms receipt
 *  PATCH  /api/transactions/:id/cancel   — Cancel transaction
 */

const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/transactions
   Buyer initiates a sale, exchange, or giveaway transaction.
───────────────────────────────────────────────────────────────────────── */
const createTransaction = async (req, res, next) => {
  try {
    const { listingId, type, exchangeListingId } = req.body;

    if (!listingId || !type) {
      return res.status(400).json({ message: 'listingId and type are required.' });
    }

    const allowedTypes = ['sale', 'exchange', 'giveaway'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${allowedTypes.join(', ')}` });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }
    if (listing.status !== 'approved') {
      return res.status(400).json({ message: 'Listing is not approved yet.' });
    }

    const typeMap = { Sell: 'sale', Exchange: 'exchange', Giveaway: 'giveaway' };
    if (typeMap[listing.listingType] !== type) {
      return res.status(400).json({ message: `Listing type '${listing.listingType}' does not match transaction type '${type}'.` });
    }

    if (listing.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot buy your own listing.' });
    }

    // Check for duplicate pending transaction
    const existing = await Transaction.findOne({
      listingId,
      buyerId: req.user._id,
      status: { $in: ['pending', 'payment_held'] },
    });
    if (existing) {
      return res.status(409).json({ message: 'You already have an active transaction for this listing.' });
    }

    const txn = await Transaction.create({
      listingId,
      buyerId: req.user._id,
      sellerId: listing.seller,
      type,
      amount: listing.price || 0,
      exchangeListingId: type === 'exchange' ? exchangeListingId || null : null,
      status: 'pending',
    });

    res.status(201).json({ message: 'Transaction initiated.', transaction: txn });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/transactions/my
   Returns transactions where user is buyer or seller.
───────────────────────────────────────────────────────────────────────── */
const getMyTransactions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { role, status, page = 1, limit = 20 } = req.query;

    const query = {};

    if (role === 'buyer') {
      query.buyerId = userId;
    } else if (role === 'seller') {
      query.sellerId = userId;
    } else {
      query.$or = [{ buyerId: userId }, { sellerId: userId }];
    }

    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('listingId', 'title images price listingType')
        .populate('buyerId', 'email profile.name')
        .populate('sellerId', 'email profile.name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(query),
    ]);

    res.json({
      transactions,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/transactions/:id
───────────────────────────────────────────────────────────────────────── */
const getTransactionById = async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id)
      .populate('listingId', 'title description images price category listingType')
      .populate('buyerId', 'email profile reputation')
      .populate('sellerId', 'email profile reputation');

    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const userId = req.user._id.toString();
    const isParty =
      txn.buyerId._id.toString() === userId ||
      txn.sellerId._id.toString() === userId ||
      req.user.role === 'Administrator';

    if (!isParty) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(txn);
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /api/transactions/:id/confirm
   Buyer or seller confirms receipt.
   When both confirm → status becomes 'completed'.
───────────────────────────────────────────────────────────────────────── */
const confirmTransaction = async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (!['pending', 'payment_held', 'buyer_confirmed', 'seller_confirmed'].includes(txn.status)) {
      return res.status(400).json({ message: `Cannot confirm a transaction in '${txn.status}' state.` });
    }

    const userId = req.user._id.toString();
    const isBuyer = txn.buyerId.toString() === userId;
    const isSeller = txn.sellerId.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const now = new Date();

    if (isBuyer && !txn.buyerConfirmedAt) {
      txn.buyerConfirmedAt = now;
      if (txn.status === 'seller_confirmed') {
        txn.status = 'completed';
        txn.completedAt = now;
      } else {
        txn.status = 'buyer_confirmed';
      }
    } else if (isSeller && !txn.sellerConfirmedAt) {
      txn.sellerConfirmedAt = now;
      if (txn.status === 'buyer_confirmed') {
        txn.status = 'completed';
        txn.completedAt = now;
      } else {
        txn.status = 'seller_confirmed';
      }
    } else {
      return res.status(400).json({ message: 'You have already confirmed this transaction.' });
    }

    await txn.save();
    res.json({ message: `Transaction ${txn.status === 'completed' ? 'completed' : 'confirmation recorded'}.`, transaction: txn });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /api/transactions/:id/cancel
   Either party can cancel a pending transaction.
───────────────────────────────────────────────────────────────────────── */
const cancelTransaction = async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (!['pending', 'payment_held'].includes(txn.status)) {
      return res.status(400).json({ message: `Cannot cancel a transaction in '${txn.status}' state.` });
    }

    const userId = req.user._id.toString();
    const isParty =
      txn.buyerId.toString() === userId ||
      txn.sellerId.toString() === userId ||
      req.user.role === 'Administrator';

    if (!isParty) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    txn.status = 'cancelled';
    await txn.save();

    res.json({ message: 'Transaction cancelled.', transaction: txn });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getMyTransactions,
  getTransactionById,
  confirmTransaction,
  cancelTransaction,
};
