const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 2000,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  listingType: {
    type: String,
    required: true,
    enum: ['sell', 'rent', 'exchange', 'giveaway'],
  },
  price: {
    type: Number,
    required: function() { return this.listingType === 'sell'; },
    min: 0,
    validate: {
      validator: function(v) {
        if (this.listingType === 'sell' && (v === undefined || v <= 0)) return false;
        if (this.listingType === 'giveaway' && v && v > 0) return false;
        return true;
      },
      message: 'Price must be > 0 for sell, and 0/absent for giveaway'
    }
  },
  rentalRate: {
    type: Number,
    required: function() { return this.listingType === 'rent'; },
    min: 0.01,
  },
  rentalPeriod: {
    type: String,
    required: function() { return this.listingType === 'rent'; },
    enum: ['day', 'week', 'month'],
  },
  deposit: {
    type: Number,
  },
  exchangeFor: {
    type: String,
    required: function() { return this.listingType === 'exchange'; },
    minlength: 3,
    maxlength: 300,
  },
  condition: {
    type: String,
    enum: ['new', 'like_new', 'good', 'fair', 'poor'],
  },
  images: [{
    url: String,
    thumbnailUrl: String,
    publicId: String,
    key: String,
    width: Number,
    height: Number,
    isPrimary: Boolean,
    order: Number,
  }],
  tags: {
    type: [String],
    validate: [v => v.length <= 8, 'Max 8 tags allowed'],
    set: tags => tags.map(t => t.toLowerCase().trim())
  },
  pickupLocation: {
    type: String,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    alias: 'seller',
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'pending_approval', 'approved', 'active', 'reserved', 'sold', 'rented', 'exchanged', 'given_away', 'rejected', 'archived'],
    default: 'draft',
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  moderatedAt: {
    type: Date,
    default: null,
  },
  moderation: {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reason: String,
  },
  aiMeta: {
    type: mongoose.Schema.Types.Mixed,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
  }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

listingSchema.virtual('seller')
  .get(function() { return this.owner; })
  .set(function(v) { this.owner = v; });

listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ category: 1, status: 1 });
listingSchema.index({ owner: 1, status: 1 });
listingSchema.index({ listingType: 1, status: 1 });
listingSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Listing', listingSchema);
