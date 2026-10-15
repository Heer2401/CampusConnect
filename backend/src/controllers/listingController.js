const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const storage = require('../services/storage');

const validateTypeFields = (data) => {
  const { listingType, price, rentalRate, rentalPeriod, deposit, exchangeFor } = data;

  if (listingType === 'sell') {
    if (price === undefined || price === null || Number(price) <= 0) {
      return 'Price is required and must be greater than 0 for sell listings';
    }
    if (rentalRate !== undefined || rentalPeriod !== undefined || deposit !== undefined) {
      return 'Rental fields are forbidden for sell listings';
    }
    if (exchangeFor !== undefined) {
      return 'Exchange fields are forbidden for sell listings';
    }
  } else if (listingType === 'rent') {
    if (rentalRate === undefined || rentalRate === null || Number(rentalRate) <= 0) {
      return 'Rental rate is required and must be greater than 0 for rent listings';
    }
    if (!rentalPeriod || !['day', 'week', 'month'].includes(rentalPeriod)) {
      return 'Rental period is required (day, week, or month) for rent listings';
    }
    if (price !== undefined && price !== null && Number(price) > 0) {
      return 'Price is forbidden for rent listings';
    }
    if (exchangeFor !== undefined) {
      return 'Exchange fields are forbidden for rent listings';
    }
  } else if (listingType === 'exchange') {
    if (!exchangeFor || exchangeFor.trim().length < 3 || exchangeFor.trim().length > 300) {
      return 'exchangeFor is required (3-300 characters) for exchange listings';
    }
    if (price !== undefined && price !== null && Number(price) > 0) {
      return 'Price is forbidden for exchange listings';
    }
    if (rentalRate !== undefined || rentalPeriod !== undefined || deposit !== undefined) {
      return 'Rental fields are forbidden for exchange listings';
    }
  } else if (listingType === 'giveaway') {
    if (price !== undefined && price !== null && Number(price) > 0) {
      return 'Price must be 0 or absent for giveaway listings';
    }
    if (rentalRate !== undefined || rentalPeriod !== undefined || deposit !== undefined) {
      return 'Rental fields are forbidden for giveaway listings';
    }
    if (exchangeFor !== undefined) {
      return 'Exchange fields are forbidden for giveaway listings';
    }
  }
  return null;
};

const createListing = async (req, res, next) => {
  try {
    const data = { ...req.body };
    data.owner = req.user._id || req.user.id;

    if (!data.category || !mongoose.Types.ObjectId.isValid(data.category)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Valid category ID is required' } });
    }

    const category = await Category.findById(data.category);
    if (!category || !category.isActive) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Category not found or inactive' } });
    }

    const typeError = validateTypeFields(data);
    if (typeError) {
      return res.status(400).json({ success: false, error: { code: 400, message: typeError } });
    }

    const autoApprove = process.env.LISTING_AUTO_APPROVE === 'true';
    data.status = autoApprove ? 'active' : 'pending_approval';

    if (data.listingType === 'giveaway') {
      data.price = 0;
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

    const filter = { status: req.query.status || 'active', isDeleted: false };

    if (req.query.category) {
      if (mongoose.Types.ObjectId.isValid(req.query.category)) {
        filter.category = req.query.category;
      } else {
        const cat = await Category.findOne({ slug: req.query.category });
        if (cat) filter.category = cat._id;
      }
    }
    if (req.query.listingType) filter.listingType = req.query.listingType;
    if (req.query.condition) filter.condition = req.query.condition;

    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      filter.price = {};
      if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
        filter.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
        filter.price.$lte = Number(req.query.maxPrice);
      }
    }

    if (req.query.q) {
      const q = req.query.q.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
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
      .populate('owner', 'name avatar')
      .lean();

    res.json({
      success: true,
      data: listings,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
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

    const userId = req.user._id || req.user.id;
    const filter = { owner: userId, isDeleted: false };
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
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    next(error);
  }
};

const getListingById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid ID' } });
    }

    const listing = await Listing.findOne({ _id: req.params.id, isDeleted: false })
      .populate('category', 'name slug')
      .populate('owner', 'name avatar');

    if (!listing) return res.status(404).json({ success: false, error: { code: 404, message: 'Not found' } });

    const currentUserId = req.user ? (req.user._id || req.user.id)?.toString() : null;
    const isOwner = currentUserId && listing.owner && listing.owner._id.toString() === currentUserId;
    const isAdmin = req.user && (req.user.role === 'Administrator' || req.user.role === 'admin');
    const isPublic = ['active', 'reserved', 'sold', 'rented', 'exchanged', 'given_away'].includes(listing.status);

    if (!isPublic && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: 403, message: 'Forbidden' } });
    }

    if (isPublic && !isOwner) {
      listing.viewCount = (listing.viewCount || 0) + 1;
      await listing.save();
    }

    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

const updateListing = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid ID' } });
    }

    const listing = await Listing.findOne({ _id: req.params.id, isDeleted: false });
    if (!listing) return res.status(404).json({ success: false, error: { code: 404, message: 'Not found' } });

    const currentUserId = (req.user._id || req.user.id)?.toString();
    const isOwner = currentUserId && listing.owner.toString() === currentUserId;
    const isAdmin = req.user && (req.user.role === 'Administrator' || req.user.role === 'admin');
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: 403, message: 'Forbidden' } });
    }

    if (req.body.category) {
      if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
        return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid category ID' } });
      }
      const category = await Category.findById(req.body.category);
      if (!category || !category.isActive) {
        return res.status(400).json({ success: false, error: { code: 400, message: 'Category not found or inactive' } });
      }
    }

    const targetType = req.body.listingType || listing.listingType;
    const merged = {
      listingType: targetType,
      price: req.body.price !== undefined ? req.body.price : listing.price,
      rentalRate: req.body.rentalRate !== undefined ? req.body.rentalRate : listing.rentalRate,
      rentalPeriod: req.body.rentalPeriod !== undefined ? req.body.rentalPeriod : listing.rentalPeriod,
      deposit: req.body.deposit !== undefined ? req.body.deposit : listing.deposit,
      exchangeFor: req.body.exchangeFor !== undefined ? req.body.exchangeFor : listing.exchangeFor,
    };

    if (req.body.listingType && req.body.listingType !== listing.listingType) {
      if (req.body.listingType !== 'sell') {
        merged.price = undefined;
        listing.price = undefined;
      }
      if (req.body.listingType !== 'rent') {
        merged.rentalRate = undefined;
        merged.rentalPeriod = undefined;
        merged.deposit = undefined;
        listing.rentalRate = undefined;
        listing.rentalPeriod = undefined;
        listing.deposit = undefined;
      }
      if (req.body.listingType !== 'exchange') {
        merged.exchangeFor = undefined;
        listing.exchangeFor = undefined;
      }
      if (req.body.listingType === 'giveaway') {
        merged.price = 0;
        listing.price = 0;
      }
    }

    const typeError = validateTypeFields(merged);
    if (typeError) {
      return res.status(400).json({ success: false, error: { code: 400, message: typeError } });
    }

    const whitelistedFields = [
      'title', 'description', 'category', 'listingType', 'price',
      'rentalRate', 'rentalPeriod', 'deposit', 'exchangeFor',
      'condition', 'tags', 'pickupLocation', 'quantity', 'status'
    ];

    let coreContentChanged = false;
    ['title', 'description', 'price', 'rentalRate', 'exchangeFor'].forEach(f => {
      if (req.body[f] !== undefined && req.body[f] !== listing[f]) {
        coreContentChanged = true;
      }
    });

    whitelistedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    if (listing.status === 'active' && coreContentChanged && process.env.LISTING_AUTO_APPROVE !== 'true') {
      listing.status = 'pending_approval';
    }

    await listing.save();
    res.json({ success: true, data: listing });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: { code: 400, message: error.message } });
    }
    next(error);
  }
};

const deleteListing = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: { code: 400, message: 'Invalid ID' } });
    }

    const listing = await Listing.findOne({ _id: req.params.id, isDeleted: false });
    if (!listing) return res.status(404).json({ success: false, error: { code: 404, message: 'Not found' } });

    const currentUserId = (req.user._id || req.user.id)?.toString();
    const isOwner = currentUserId && listing.owner.toString() === currentUserId;
    const isAdmin = req.user && (req.user.role === 'Administrator' || req.user.role === 'admin');
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: 403, message: 'Forbidden' } });
    }

    if (['reserved', 'rented'].includes(listing.status)) {
      return res.status(409).json({ success: false, error: { code: 409, message: 'Cannot delete a listing in active transaction' } });
    }

    listing.isDeleted = true;
    listing.deletedAt = new Date();
    await listing.save();

    if (listing.images && listing.images.length > 0) {
      for (const img of listing.images) {
        storage.remove(img.publicId || img.key).catch(e => {
          // ignore cleanup errors during delete
        });
      }
    }

    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createListing,
  getListings,
  getMyListings,
  getListingById,
  updateListing,
  deleteListing,
};
