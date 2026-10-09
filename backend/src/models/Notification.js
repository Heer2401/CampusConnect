const mongoose = require('mongoose');

// FR-4.5: In-app user notifications
// OpenAPI: GET /notifications, PATCH /notifications/:id/read
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'listing_approved',
      'listing_rejected',
      'price_alert',
      'match_found',
      'rental_reminder',
      'chat_message',
      'transaction_update',
      'system'
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  relatedModel: {
    type: String,
    enum: ['Listing', 'Transaction', 'Rental', 'ChatThread', 'WantedPost', null],
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
