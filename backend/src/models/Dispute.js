const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  disputeType: {
    type: String,
    enum: ['ListingReport', 'UserMisconduct', 'RentalIssue', 'PaymentTransaction', 'Other'],
    default: 'ListingReport',
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  relatedListing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    default: null,
  },
  description: {
    type: String,
    required: true,
  },
  evidence: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'dismissed'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  adminDecision: {
    actionTaken: {
      type: String,
      enum: ['NoAction', 'ListingRemoved', 'UserWarned', 'UserSuspended', 'RefundIssued', 'Other'],
      default: 'NoAction',
    },
    notes: {
      type: String,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Dispute', disputeSchema);
