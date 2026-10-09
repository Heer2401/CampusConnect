const mongoose = require('mongoose');

// FR-2.7, FR-1.6, AC-8: Buy/Exchange/Giveaway transactions
// OpenAPI: /transactions, /transactions/:id/pay, /transactions/:id/confirm-receipt
const transactionSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['sale', 'exchange', 'giveaway'],
    default: 'sale',
  },
  status: {
    type: String,
    enum: [
      'pending',
      'payment_held',
      'buyer_confirmed',
      'seller_confirmed',
      'completed',
      'cancelled',
      'refunded'
    ],
    default: 'pending',
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
  paymentMethodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentMethod',
    default: null,
  },
  paymentRef: {
    type: String,
    default: null,
  },
  exchangeListingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    default: null,
  },
  buyerConfirmedAt: {
    type: Date,
    default: null,
  },
  sellerConfirmedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
transactionSchema.index({ buyerId: 1, status: 1 });
transactionSchema.index({ sellerId: 1, status: 1 });
transactionSchema.index({ listingId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
