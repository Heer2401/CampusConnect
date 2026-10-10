const mongoose = require('mongoose');

// FR-1.5: Rating & review system post-transaction
// OpenAPI: POST /reviews, GET /users/:id/reviews
const reviewSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  revieweeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    trim: true,
    default: '',
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
reviewSchema.index({ revieweeId: 1 });
reviewSchema.index({ transactionId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
