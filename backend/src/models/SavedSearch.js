const mongoose = require('mongoose');

// FR-4.2: Saved search queries and filter parameters
// OpenAPI: /search/saved
const savedSearchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  filters: {
    query: { type: String, default: '' },
    category: { type: String, default: null },
    minPrice: { type: Number, default: null },
    maxPrice: { type: Number, default: null },
    condition: { type: String, default: null },
    listingType: { type: String, default: null },
  },
  alertEnabled: {
    type: Boolean,
    default: true,
  },
  lastAlertedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
savedSearchSchema.index({ userId: 1 });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
