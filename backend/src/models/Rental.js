const mongoose = require('mongoose');

// FR-5.1 to FR-5.5, AC-5: Rental lifecycle & physical QR handover verification
// OpenAPI: /rentals, /rentals/:id/approve, /rentals/:id/verify-handover, /rentals/:id/complete
const rentalSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  renterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['requested', 'approved', 'active', 'completed', 'cancelled', 'overdue'],
    default: 'requested',
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
  deposit: {
    type: Number,
    default: 0,
  },
  qrCode: {
    type: String,
    default: null, // Generated when owner approves request (FR-5.2)
  },
  qrUsed: {
    type: Boolean,
    default: false, // Prevents reuse (AC-5)
  },
  pickupAt: {
    type: Date,
    default: null, // Timestamp when handover is verified
  },
  returnedAt: {
    type: Date,
    default: null, // Timestamp when rental completed
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
rentalSchema.index({ renterId: 1, status: 1 });
rentalSchema.index({ ownerId: 1, status: 1 });
rentalSchema.index({ listingId: 1, startDate: 1, dueDate: 1 });

module.exports = mongoose.model('Rental', rentalSchema);
