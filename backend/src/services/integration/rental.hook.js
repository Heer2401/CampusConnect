const Listing = require('../../models/Listing');

const getRentableListing = async (id) => {
  return await Listing.findOne({ _id: id, listingType: 'rent', status: 'active', isDeleted: false })
    .select('rentalRate rentalPeriod deposit owner title status')
    .lean();
};

const markStatus = async (id, status, { actorId } = {}) => {
  const allowedTransitions = {
    'active': ['reserved', 'sold', 'rented', 'exchanged', 'given_away'],
    'reserved': ['sold', 'active'],
  };

  const listing = await Listing.findById(id);
  if (!listing) return false;

  const validNext = allowedTransitions[listing.status] || [];
  if (!validNext.includes(status)) {
    throw new Error(`Invalid status transition from ${listing.status} to ${status}`);
  }

  listing.status = status;
  await listing.save();
  return true;
};

module.exports = {
  getRentableListing,
  markStatus,
};
