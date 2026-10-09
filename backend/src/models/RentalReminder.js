const mongoose = require('mongoose');

// FR-5.4: Automated reminders for upcoming & overdue rentals
const rentalReminderSchema = new mongoose.Schema({
  rentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['due_soon', 'overdue', 'return_confirmed'],
    required: true,
  },
  scheduledFor: {
    type: Date,
    required: true,
  },
  sentAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────
rentalReminderSchema.index({ scheduledFor: 1, sentAt: 1 });
rentalReminderSchema.index({ rentalId: 1 });

module.exports = mongoose.model('RentalReminder', rentalReminderSchema);
