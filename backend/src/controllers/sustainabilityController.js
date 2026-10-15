/**
 * Dhrumil Doshi (202512088) — Authentication & User Management Lead
 * sustainabilityController.js
 * 
 * Implements FR-1.8: Personal Sustainability Dashboard
 * OpenAPI: GET /sustainability/me
 */

const SustainabilityStat = require('../models/SustainabilityStat');

// @desc    Get personal sustainability dashboard data for current user (FR-1.8)
// @route   GET /api/sustainability/me
// @access  Private
const getMySustainability = async (req, res, next) => {
  try {
    let stat = await SustainabilityStat.findOne({ userId: req.user._id });

    // Auto-initialize if this is the first time the user views the dashboard
    if (!stat) {
      stat = await SustainabilityStat.create({
        userId: req.user._id,
        itemsReused: 0,
        moneySaved: 0,
        co2SavedKg: 0,
        transactions: 0,
      });
    }

    res.json({
      userId: stat.userId,
      itemsReused: stat.itemsReused,
      moneySaved: stat.moneySaved,
      co2ImpactKg: stat.co2SavedKg, // OpenAPI spec field name
      transactions: stat.transactions,
      lastUpdated: stat.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMySustainability,
};
