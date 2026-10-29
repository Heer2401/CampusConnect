const mongoose = require('mongoose');

const rentalRequestMatchSchema = new mongoose.Schema({
  rentalRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentalRequest',
    required: true,
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  similarityScore: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'notified', 'viewed', 'dismissed'],
    default: 'pending',
  },
}, { timestamps: true });

rentalRequestMatchSchema.index({ rentalRequestId: 1, listingId: 1 }, { unique: true });

module.exports = mongoose.model('RentalRequestMatch', rentalRequestMatchSchema);
