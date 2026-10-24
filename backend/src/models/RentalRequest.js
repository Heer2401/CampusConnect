const mongoose = require('mongoose');

/**
 * Charmi Bhayani (202512028) — Rental & Transaction Management
 * RentalRequest: A student's open call for an item they need on rent
 * that is NOT already listed in the marketplace.
 *
 * This is separate from Rental (which requires an existing listingId).
 * Workflow:
 *   1. Renter submits a request (itemName, description, dates, budget)
 *   2. Any owner who has the item can "Offer to Fulfil" (future feature)
 *   3. Request expires after dueDate or is closed manually
 */
const rentalRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      trim: true,
      default: 'Other',
    },
    startDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    budgetPerDay: {
      type: Number,
      default: null, // null means flexible / open to negotiation
    },
    status: {
      type: String,
      enum: ['open', 'fulfilled', 'cancelled', 'expired'],
      default: 'open',
    },
  },
  { timestamps: true }
);

rentalRequestSchema.index({ requesterId: 1, status: 1 });
rentalRequestSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model('RentalRequest', rentalRequestSchema);
