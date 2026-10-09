const mongoose = require('mongoose');

// FR-1.6: Saved payment methods for transactions
// OpenAPI: GET/POST /users/me/payment-methods
const paymentMethodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['upi', 'card', 'bank_transfer'],
    required: true,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
  details: {
    upiId: { type: String, default: null },      // masked UPI ID
    last4: { type: String, default: null },       // last 4 digits of card
    bankName: { type: String, default: null },    // bank name for transfers
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
paymentMethodSchema.index({ userId: 1 });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
