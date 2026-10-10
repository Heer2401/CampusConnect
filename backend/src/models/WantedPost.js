const mongoose = require('mongoose');

// US-05: Wanted posts created by students looking for specific items
// OpenAPI: /wanted-posts
const wantedPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  budgetMin: {
    type: Number,
    default: 0,
  },
  budgetMax: {
    type: Number,
    default: null,
  },
  status: {
    type: String,
    enum: ['open', 'matched', 'closed'],
    default: 'open',
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
wantedPostSchema.index({ status: 1, categoryId: 1 });
wantedPostSchema.index({ userId: 1 });
wantedPostSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('WantedPost', wantedPostSchema);
