const mongoose = require('mongoose');

// FR-1.8: Per-user sustainability metrics (items reused, money saved, CO2 impact)
// OpenAPI: GET /sustainability/me
const sustainabilityStatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  itemsReused: {
    type: Number,
    default: 0,
  },
  moneySaved: {
    type: Number,
    default: 0,
  },
  co2SavedKg: {
    type: Number,
    default: 0,
  },
  transactions: {
    type: Number,
    default: 0,
  },
  lastUpdatedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('SustainabilityStat', sustainabilityStatSchema);
