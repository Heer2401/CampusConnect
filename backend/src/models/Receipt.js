const mongoose = require('mongoose');

// FR-1.7, AC-8: Proof of purchase / transaction receipt
const receiptSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    unique: true,
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
  amount: {
    type: Number,
    required: true,
  },
  listingSnapshot: {
    title: { type: String, required: true },
    category: { type: String },
    condition: { type: String },
    price: { type: Number },
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
receiptSchema.index({ buyerId: 1 });
receiptSchema.index({ sellerId: 1 });

module.exports = mongoose.model('Receipt', receiptSchema);
