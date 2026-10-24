/**
 * Dhrumil Doshi (202512088) — Authentication & User Management Lead
 * sustainabilityController.js
 * 
 * Implements FR-1.8: Personal Sustainability Dashboard
 * OpenAPI: GET /sustainability/me
 */

const SustainabilityStat = require('../models/SustainabilityStat');
const Transaction = require('../models/Transaction');
const Rental = require('../models/Rental');
const Listing = require('../models/Listing');

/**
 * Computes live, accurate sustainability metrics for a given user from their
 * completed transactions and rentals.
 */
const computeUserSustainability = async (userId) => {
  try {
    // 1. Fetch completed buy/exchange/giveaway transactions
    const transactions = await Transaction.find({
      $or: [{ buyerId: userId }, { sellerId: userId }],
      status: 'completed',
    }).populate({
      path: 'listingId',
      populate: { path: 'category' },
    });

    // 2. Fetch completed or active rentals
    const rentals = await Rental.find({
      $or: [{ renterId: userId }, { ownerId: userId }],
      status: { $in: ['active', 'completed'] },
    }).populate({
      path: 'listingId',
      populate: { path: 'category' },
    });

    let itemsReused = 0;
    let moneySaved = 0;
    let co2SavedKg = 0;
    let completedCount = 0;

    // Standard lifecycle CO2 emission offsets based on product category
    const getCO2ForCategory = (catSlug = '', title = '') => {
      const slug = (catSlug || '').toLowerCase();
      const t = (title || '').toLowerCase();
      if (slug.includes('book') || slug.includes('note') || slug.includes('paper') || t.includes('book')) {
        return 2.5; // ~2.5 kg CO2 avoided per reused book (paper manufacturing & transport)
      }
      if (slug.includes('elect') || slug.includes('lab') || slug.includes('gadget') || t.includes('calc') || t.includes('laptop')) {
        return 12.0; // ~12 kg CO2 avoided per electronic/lab hardware (semiconductor fabrication)
      }
      if (slug.includes('hostel') || slug.includes('room') || slug.includes('furniture')) {
        return 5.5; // ~5.5 kg CO2 avoided per room essential
      }
      return 3.5; // General average for campus essentials
    };

    // Calculate transaction impact
    transactions.forEach((tx) => {
      itemsReused += 1;
      completedCount += 1;
      const catSlug = tx.listingId?.category?.slug || '';
      const title = tx.listingId?.title || '';
      co2SavedKg += getCO2ForCategory(catSlug, title);

      const price = tx.listingId?.price || tx.amount || 0;
      const isBuyer = tx.buyerId?.toString() === userId.toString();

      if (tx.type === 'giveaway') {
        // Full retail savings for receiver (~₹350)
        moneySaved += isBuyer ? 350 : 0;
      } else if (tx.type === 'exchange') {
        // Both parties saved by avoiding new purchases (~₹400)
        moneySaved += 400;
      } else {
        // Sale: Buyer saved discount vs retail (~50% of price or min ₹100); Seller recovered cash
        moneySaved += isBuyer ? Math.max(100, Math.round(price * 0.5)) : Math.round(price);
      }
    });

    // Calculate rental impact
    rentals.forEach((r) => {
      itemsReused += 1;
      completedCount += 1;
      const catSlug = r.listingId?.category?.slug || '';
      const title = r.listingId?.title || '';
      co2SavedKg += getCO2ForCategory(catSlug, title);

      const isRenter = r.renterId?.toString() === userId.toString();
      const rentalFee = r.price || 50;
      // Renter saved buying equipment brand-new; owner earned rental income
      moneySaved += isRenter ? Math.max(250, rentalFee * 3) : rentalFee;
    });

    let stat = await SustainabilityStat.findOne({ userId });
    if (!stat) {
      stat = new SustainabilityStat({ userId });
    }

    stat.itemsReused = itemsReused;
    stat.moneySaved = moneySaved;
    stat.co2SavedKg = parseFloat(co2SavedKg.toFixed(1));
    stat.transactions = completedCount;
    await stat.save();

    return stat;
  } catch (err) {
    console.error('[computeUserSustainability] Error computing stats:', err.message);
    // Fall back to existing record if calculation encounters an issue
    return await SustainabilityStat.findOne({ userId });
  }
};

// @desc    Get personal sustainability dashboard data for current user (FR-1.8)
// @route   GET /api/sustainability/me
// @access  Private
const getMySustainability = async (req, res, next) => {
  try {
    // Recompute live from completed transactions/rentals so it always stays in sync
    const stat = await computeUserSustainability(req.user._id);

    res.json({
      userId: stat ? stat.userId : req.user._id,
      itemsReused: stat ? stat.itemsReused : 0,
      moneySaved: stat ? stat.moneySaved : 0,
      co2ImpactKg: stat ? stat.co2SavedKg : 0, // OpenAPI spec field name
      transactions: stat ? stat.transactions : 0,
      lastUpdated: stat ? stat.updatedAt : new Date(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMySustainability,
  computeUserSustainability,
};
