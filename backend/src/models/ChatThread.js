const mongoose = require('mongoose');

// FR-4.4: Chat thread between buyer/renter and listing owner
// OpenAPI: /chat/threads
const chatThreadSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    default: null,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  lastMessagePreview: {
    type: String,
    default: '',
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
chatThreadSchema.index({ participants: 1 });
chatThreadSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('ChatThread', chatThreadSchema);
