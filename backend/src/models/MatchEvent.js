const mongoose = require('mongoose');

// FR-3.3: AI semantic matching between listings and wanted posts
const matchEventSchema = new mongoose.Schema({
  wantedPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WantedPost',
    required: true,
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  similarityScore: {
    type: Number,
    required: true, // 0.0 to 1.0 confidence score
  },
  status: {
    type: String,
    enum: ['pending', 'notified', 'viewed', 'dismissed'],
    default: 'pending',
  },
  notifiedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
matchEventSchema.index({ wantedPostId: 1, listingId: 1 }, { unique: true });
matchEventSchema.index({ status: 1 });

module.exports = mongoose.model('MatchEvent', matchEventSchema);
