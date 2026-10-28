const Listing = require('../models/Listing');
const WantedPost = require('../models/WantedPost');
const MatchEvent = require('../models/MatchEvent');
const { evaluateListingMatches } = require('./integration/ai.hook');
const { sendNotification } = require('./notificationService');

const matchListingToWantedPosts = async (app, listingOrId) => {
  const listingId = typeof listingOrId === 'string' ? listingOrId : listingOrId?._id;
  const listing = listingId
    ? await Listing.findById(listingId).populate('category', 'name').lean()
    : null;
  if (!listing || !['active', 'approved'].includes(listing.status) || listing.isDeleted) {
    return { deferred: true, matches: [] };
  }

  const categoryId = listing.category?._id || listing.category;
  const categoryName = listing.category?.name || '';
  const ownerId = listing.owner?._id || listing.owner;
  const wanted = await WantedPost.find({
    status: 'open',
    userId: { $ne: ownerId },
    $or: [{ categoryId }, { categoryId: null }],
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .populate('categoryId', 'name')
    .lean();

  if (!wanted.length) return { deferred: false, open_wanted_post_count: 0, matches: [] };

  const result = await evaluateListingMatches({
    listing: {
      id: String(listing._id),
      title: listing.title,
      description: listing.description || '',
      category: categoryName,
      price: listing.listingType === 'rent' ? listing.rentalRate : listing.price,
    },
    wantedPosts: wanted.map((post) => ({
      id: String(post._id),
      user_id: String(post.userId),
      title: post.title,
      description: post.description || '',
      category: post.categoryId?.name || categoryName,
      budget_max: post.budgetMax,
    })),
  });

  const wantedById = new Map(wanted.map((post) => [String(post._id), post]));
  const matches = [];
  for (const match of result.matches || []) {
    const post = wantedById.get(String(match.wanted_post_id));
    if (!post) continue;
    let isNew = false;
    try {
      await MatchEvent.create({
        wantedPostId: post._id,
        listingId: listing._id,
        similarityScore: match.similarity_score,
      });
      isNew = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      await MatchEvent.updateOne(
        { wantedPostId: post._id, listingId: listing._id },
        { similarityScore: match.similarity_score }
      );
    }

    if (isNew) {
      await sendNotification(app, {
        userId: post.userId,
        type: 'match_found',
        title: 'A listing matches your wanted post',
        message: `"${listing.title}" may match your request "${post.title}".`,
        relatedId: listing._id,
        relatedModel: 'Listing',
      });
    }
    matches.push({
      wanted_post_id: String(post._id),
      title: post.title,
      similarity_score: match.similarity_score,
    });
  }

  return { deferred: false, open_wanted_post_count: wanted.length, matches };
};

module.exports = { matchListingToWantedPosts };
