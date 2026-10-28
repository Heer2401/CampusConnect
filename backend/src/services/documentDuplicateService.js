const Listing = require('../models/Listing');
const { compareDocumentText } = require('./integration/ai.hook');

const findDocumentDuplicate = async ({ documentText, categoryId, excludeListingId = null }) => {
  const filter = {
    category: categoryId,
    status: { $in: ['active', 'approved'] },
    isDeleted: false,
    documentText: { $exists: true, $ne: '' },
  };
  if (excludeListingId) filter._id = { $ne: excludeListingId };
  const candidates = await Listing.find(filter)
    .select('title')
    .select('+documentText')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  if (!candidates.length) {
    return { is_duplicate: false, matched_listing_id: null, matched_title: null, similarity: 0, threshold: 0.82, candidate_count: 0 };
  }

  const result = await compareDocumentText({
    documentText,
    candidates: candidates.map((listing) => ({
      listing_id: String(listing._id),
      text: listing.documentText || '',
    })),
  });
  const matched = candidates.find((listing) => String(listing._id) === String(result.matched_listing_id));
  return {
    ...result,
    matched_title: matched?.title || null,
    candidate_count: candidates.length,
  };
};

module.exports = { findDocumentDuplicate };
