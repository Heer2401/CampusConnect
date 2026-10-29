const Listing = require('../models/Listing');
const RentalRequest = require('../models/RentalRequest');
const RentalRequestMatch = require('../models/RentalRequestMatch');
const { evaluateListingMatches } = require('./integration/ai.hook');
const { sendNotification } = require('./notificationService');

const matchListingToRequests = async (app, listingOrId) => {
  const listingId = typeof listingOrId === 'string' ? listingOrId : listingOrId?._id;
  const listing = listingId
    ? await Listing.findById(listingId).populate('category', 'name').lean()
    : null;
  if (!listing || !['active', 'approved'].includes(listing.status) || listing.isDeleted) {
    return { deferred: true, matches: [] };
  }

  const ownerId = listing.owner?._id || listing.owner;
  const requests = await RentalRequest.find({ status: 'open', requesterId: { $ne: ownerId } })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  if (!requests.length) return { deferred: false, open_request_count: 0, matches: [] };

  const result = await evaluateListingMatches({
    listing: {
      id: String(listing._id),
      title: listing.title,
      description: listing.description || '',
      category: listing.category?.name || '',
      price: listing.listingType === 'rent' ? listing.rentalRate : listing.price,
    },
    wantedPosts: requests.map((request) => ({
      id: String(request._id),
      user_id: String(request.requesterId),
      title: request.itemName,
      description: request.description || '',
      category: request.category || 'Other',
      budget_max: request.budgetPerDay,
    })),
  });

  const requestById = new Map(requests.map((request) => [String(request._id), request]));
  const matches = [];
  for (const match of result.matches || []) {
    const request = requestById.get(String(match.wanted_post_id));
    if (!request) continue;
    let isNew = false;
    try {
      await RentalRequestMatch.create({
        rentalRequestId: request._id,
        listingId: listing._id,
        similarityScore: match.similarity_score,
      });
      isNew = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      await RentalRequestMatch.updateOne(
        { rentalRequestId: request._id, listingId: listing._id },
        { similarityScore: match.similarity_score }
      );
    }

    if (isNew) {
      await sendNotification(app, {
        userId: request.requesterId,
        type: 'match_found',
        title: 'A listing matches your request',
        message: `"${listing.title}" may match your request "${request.itemName}".`,
        relatedId: listing._id,
        relatedModel: 'Listing',
      });
    }
    matches.push({
      rental_request_id: String(request._id),
      title: request.itemName,
      similarity_score: match.similarity_score,
    });
  }

  return { deferred: false, open_request_count: requests.length, matches };
};

const matchExistingListingsToRequest = async (app, requestId) => {
  const request = await RentalRequest.findById(requestId).lean();
  if (!request || request.status !== 'open') return;
  const listings = await Listing.find({
    status: { $in: ['active', 'approved'] },
    isDeleted: false,
    owner: { $ne: request.requesterId },
  }).select('_id').sort({ createdAt: -1 }).limit(50).lean();

  for (const listing of listings) {
    await matchListingToRequests(app, listing._id);
  }
};

module.exports = { matchListingToRequests, matchExistingListingsToRequest };
