const Listing = require('../models/Listing');

const createListing = async (req, res, next) => {
  try {
    const data = req.body;
    data.owner = req.user._id;
    
    // Auto approve if dev env or env variable is set
    const autoApprove = process.env.LISTING_AUTO_APPROVE === 'true';
    data.status = autoApprove ? 'active' : 'pending_approval';

    // Type switch clearing
    if (data.listingType === 'giveaway') {
      data.price = undefined;
    }
    
    const listing = new Listing(data);
    await listing.save();
    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: { code: 400, message: error.message } });
    }
    next(error);
  }
};

const getListings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 50);
    const skip = (page - 1) * limit;

    const filter = { status: 'active', isDeleted: false };
    
    if (req.query.category) filter.category = req.query.category;
    if (req.query.listingType) filter.listingType = req.query.listingType;
    if (req.query.condition) filter.condition = req.query.condition;
    
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }
    
    if (req.query.q) {
      filter.$text = { $search: req.query.q };
    }

    let sort = { createdAt: -1 };
    if (req.query.sort === 'oldest') sort = { createdAt: 1 };
    if (req.query.sort === 'price_asc') sort = { price: 1 };
    if (req.query.sort === 'price_desc') sort = { price: -1 };

    const total = await Listing.countDocuments(filter);
    const listings = await Listing.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name slug')
      .populate('owner', 'name avatar') // No email/phone
      .lean();

    res.json({
      success: true,
      data: listings,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getMyListings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 50);
    const skip = (page - 1) * limit;

    const filter = { owner: req.user._id, isDeleted: false };
    if (req.query.status) filter.status = req.query.status;

    const total = await Listing.countDocuments(filter);
    const listings = await Listing.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('category', 'name slug')
      .lean();

    res.json({
      success: true,
      data: listings,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, isDeleted: false })
      .populate('category', 'name slug')
      .populate('owner', 'name avatar');
      
    if (!listing) return res.status(404).json({ success: false, error: { code: 404, message: 'Not found' } });

    // Non-public statuses visible only to owner/admin
    const isOwner = req.user && req.user._id.toString() === listing.owner._id.toString();
    const isAdmin = req.user && req.user.role === 'Administrator';
    const isPublic = ['active', 'reserved', 'sold', 'rented', 'exchanged', 'given_away'].includes(listing.status);

    if (!isPublic && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: 403, message: 'Forbidden' } });
    }

    if (isPublic && !isOwner) {
      listing.viewCount += 1;
      await listing.save();
    }

    res.json({ success: true, data: listing });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid ID' } });
    next(error);
  }
};

const updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, isDeleted: false });
    if (!listing) return res.status(404).json({ success: false, error: { code: 404, message: 'Not found' } });

    const isOwner = req.user._id.toString() === listing.owner.toString();
    const isAdmin = req.user.role === 'Administrator';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: 403, message: 'Forbidden' } });
    }

    const whitelistedFields = [
      'title', 'description', 'category', 'listingType', 'price', 
      'rentalRate', 'rentalPeriod', 'deposit', 'exchangeFor', 
      'condition', 'tags', 'pickupLocation', 'quantity'
    ];
    
    whitelistedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    if (req.body.listingType) {
      if (req.body.listingType !== 'sell' && req.body.listingType !== 'rent') listing.price = undefined;
      if (req.body.listingType !== 'rent') {
        listing.rentalRate = undefined;
        listing.rentalPeriod = undefined;
        listing.deposit = undefined;
      }
      if (req.body.listingType !== 'exchange') listing.exchangeFor = undefined;
      if (req.body.listingType === 'giveaway') listing.price = undefined;
    }

    if (listing.status === 'active' && process.env.LISTING_AUTO_APPROVE !== 'true') {
      listing.status = 'pending_approval';
    }

    await listing.save();
    res.json({ success: true, data: listing });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: { code: 400, message: error.message } });
    }
    if (error.name === 'CastError') return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid ID' } });
    next(error);
  }
};

const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, isDeleted: false });
    if (!listing) return res.status(404).json({ success: false, error: { code: 404, message: 'Not found' } });

    const isOwner = req.user._id.toString() === listing.owner.toString();
    const isAdmin = req.user.role === 'Administrator';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: 403, message: 'Forbidden' } });
    }

    if (['reserved', 'rented'].includes(listing.status)) {
      return res.status(409).json({ success: false, error: { code: 409, message: 'Cannot delete a listing in active transaction' } });
    }

    listing.isDeleted = true;
    listing.deletedAt = new Date();
    await listing.save();
    
    // TODO: trigger image cleanup through storage adapter

    res.json({ success: true, data: {} });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid ID' } });
    next(error);
  }
};

module.exports = {
  createListing,
  getListings,
  getMyListings,
  getListingById,
  updateListing,
  deleteListing
};
