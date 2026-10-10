const mongoose = require('mongoose');

// FR-7.1: System audit log for admin actions and security audit trail
// OpenAPI: GET /audit-logs
const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true, // e.g. 'listing.approve', 'user.suspend', 'category.create'
  },
  targetModel: {
    type: String,
    required: true, // e.g. 'Listing', 'User', 'Category', 'Dispute'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null, // Before / after change snapshot
  },
  ipAddress: {
    type: String,
    default: null,
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
