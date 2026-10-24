/**
 * Charmi Bhayani (202512028) — Rental & Transaction Management Lead
 * rentalController.js
 *
 * Covers: FR-5.1–FR-5.5, AC-5
 *  POST   /api/rentals                    — Create rental request
 *  GET    /api/rentals/my-rentals         — Current user's rentals (renter + owner)
 *  GET    /api/rentals/:id                — Rental details
 *  PATCH  /api/rentals/:id/status         — Owner approve / reject (guarded transitions)
 *  POST   /api/rentals/:id/handover       — QR handover verification (renter scans)
 *  POST   /api/rentals/:id/return         — Record item return & complete rental
 */

const Rental = require('../models/Rental');
const Listing = require('../models/Listing');
const RentalReminder = require('../models/RentalReminder');
const QRCode = require('qrcode');
const { randomUUID: uuidv4 } = require('crypto');
const { computeUserSustainability } = require('./sustainabilityController');


/* ─────────────────────────────────────────────────────────────────────────
   ALLOWED STATUS TRANSITIONS
   Who        From          To
   owner      requested  → approved | cancelled
   owner      approved   → cancelled
   system     approved   → active        (via handover)
   system     active     → completed     (via return)
   system     active     → overdue       (via cron job)
   renter     requested  → cancelled
───────────────────────────────────────────────────────────────────────── */
const OWNER_TRANSITIONS = {
  requested: ['approved', 'cancelled'],
  approved: ['cancelled'],
};
const RENTER_CANCEL_FROM = ['requested'];

/* ─────────────────────────────────────────────────────────────────────────
   Helper – schedule due-date reminders when a rental is approved
───────────────────────────────────────────────────────────────────────── */
async function scheduleReminders(rental) {
  const reminders = [];

  // 3-day-before reminder for renter
  const threeDaysBefore = new Date(rental.dueDate);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  if (threeDaysBefore > new Date()) {
    reminders.push({
      rentalId: rental._id,
      userId: rental.renterId,
      type: 'due_soon',
      scheduledFor: threeDaysBefore,
    });
  }

  // 1-day-before reminder for renter
  const oneDayBefore = new Date(rental.dueDate);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);
  if (oneDayBefore > new Date()) {
    reminders.push({
      rentalId: rental._id,
      userId: rental.renterId,
      type: 'due_soon',
      scheduledFor: oneDayBefore,
    });
  }

  if (reminders.length > 0) {
    await RentalReminder.insertMany(reminders);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/rentals
   Create a rental request.  Validates listing type, ownership, and
   date conflicts before inserting.
───────────────────────────────────────────────────────────────────────── */
const createRental = async (req, res, next) => {
  try {
    const { listingId, startDate, dueDate, message } = req.body;

    if (!listingId || !startDate || !dueDate) {
      return res.status(400).json({ message: 'listingId, startDate and dueDate are required.' });
    }

    const start = new Date(startDate);
    const due = new Date(dueDate);

    if (isNaN(start) || isNaN(due)) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }
    if (start >= due) {
      return res.status(400).json({ message: 'startDate must be before dueDate.' });
    }
    if (start < new Date()) {
      return res.status(400).json({ message: 'startDate cannot be in the past.' });
    }

    // Fetch listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }
    if (listing.listingType !== 'rent') {
      return res.status(400).json({ message: 'This listing is not available for rent.' });
    }
    if (!['approved', 'active'].includes(listing.status)) {
      return res.status(400).json({ message: 'Listing is not currently available for rental.' });
    }

    // Cannot rent your own item
    if (listing.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot rent your own listing.' });
    }

    // Conflict check — overlapping approved/active rentals on same listing
    const conflict = await Rental.findOne({
      listingId,
      status: { $in: ['approved', 'active'] },
      $or: [
        { startDate: { $lt: due }, dueDate: { $gt: start } },
      ],
    });
    if (conflict) {
      return res.status(409).json({ message: 'This item is already booked for the selected dates.' });
    }

    const rental = await Rental.create({
      listingId,
      renterId: req.user._id,
      ownerId: listing.seller,
      startDate: start,
      dueDate: due,
      price: listing.rentalRate || listing.price || 0,
      deposit: listing.deposit || 0,
      status: 'requested',
    });

    // Reserve the listing so it cannot be double-booked
    await Listing.findByIdAndUpdate(listingId, { status: 'reserved' });

    // Send notifications to owner and renter
    const { sendNotification } = require('../services/notificationService');
    const renterName = req.user.profile?.name || req.user.name || req.user.email || 'A student';
    sendNotification(req.app, {
      userId: listing.seller,
      type: 'rental',
      title: 'New Rental Request! 📦',
      message: `${renterName} requested to rent "${listing.title}". Review in your dashboard!`,
      relatedId: rental._id,
      relatedModel: 'Rental'
    });
    sendNotification(req.app, {
      userId: req.user._id,
      type: 'rental',
      title: 'Rental Request Submitted! 📦',
      message: `Your request to rent "${listing.title}" is submitted. Awaiting owner approval!`,
      relatedId: rental._id,
      relatedModel: 'Rental'
    });

    res.status(201).json({ message: 'Rental request submitted.', rental });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/rentals/my-rentals
   Returns all rentals where user is renter OR owner.
───────────────────────────────────────────────────────────────────────── */
const getMyRentals = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { role, status, page = 1, limit = 20 } = req.query;

    const query = {};

    if (role === 'renter') {
      query.renterId = userId;
    } else if (role === 'owner') {
      query.ownerId = userId;
    } else {
      query.$or = [{ renterId: userId }, { ownerId: userId }];
    }

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [rentals, total] = await Promise.all([
      Rental.find(query)
        .populate('listingId', 'title images price listingType')
        .populate('renterId', 'email profile.name')
        .populate('ownerId', 'email profile.name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Rental.countDocuments(query),
    ]);

    res.json({
      rentals,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/rentals/:id
   Returns rental details — accessible by renter, owner, or admin.
───────────────────────────────────────────────────────────────────────── */
const getRentalById = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate('listingId', 'title description images price category condition listingType')
      .populate('renterId', 'email profile reputation')
      .populate('ownerId', 'email profile reputation');

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found.' });
    }

    const userId = req.user._id.toString();
    const isParty =
      rental.renterId._id.toString() === userId ||
      rental.ownerId._id.toString() === userId ||
      req.user.role === 'Administrator';

    if (!isParty) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(rental);
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /api/rentals/:id/status
   Owner: approve | cancel   /   Renter: cancel (from 'requested' only)
   On approve → generate QR code token + schedule reminders.
───────────────────────────────────────────────────────────────────────── */
const updateRentalStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found.' });
    }

    const userId = req.user._id.toString();
    const isOwner = rental.ownerId.toString() === userId;
    const isRenter = rental.renterId.toString() === userId;

    if (!isOwner && !isRenter) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Owner-driven transitions
    if (isOwner) {
      const allowed = OWNER_TRANSITIONS[rental.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Cannot transition from '${rental.status}' to '${status}' as owner.`,
        });
      }
    }

    // Renter can only cancel from 'requested'
    if (isRenter && !isOwner) {
      if (status !== 'cancelled' || !RENTER_CANCEL_FROM.includes(rental.status)) {
        return res.status(400).json({
          message: `Renter can only cancel a request that is still in 'requested' state.`,
        });
      }
    }

    rental.status = status;

    // On approval: generate a unique QR token
    if (status === 'approved') {
      const token = uuidv4();
      // Store compact token; frontend or mobile will render QR from this
      rental.qrCode = token;
      rental.qrUsed = false;

      // Schedule reminders for renter
      await scheduleReminders(rental);

      // Notify renter
      const { sendNotification } = require('../services/notificationService');
      sendNotification(req.app, {
        userId: rental.renterId,
        type: 'transaction_update',
        title: 'Rental Request Approved',
        message: 'Your rental request has been approved! Meet the owner for physical QR handover.',
        relatedId: rental._id,
        relatedModel: 'Rental'
      });
    } else if (status === 'cancelled') {
      const { sendNotification } = require('../services/notificationService');
      sendNotification(req.app, {
        userId: isOwner ? rental.renterId : rental.ownerId,
        type: 'transaction_update',
        title: 'Rental Request Cancelled',
        message: isOwner ? 'The owner cancelled the rental request.' : 'The renter cancelled their rental request.',
        relatedId: rental._id,
        relatedModel: 'Rental'
      });
      // Un-reserve the listing so it is available again
      await Listing.findByIdAndUpdate(rental.listingId, { status: 'active' });
    }

    await rental.save();
    res.json({ message: `Rental status updated to '${status}'.`, rental });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/rentals/:id/handover
   Renter submits the QR token from the owner's screen to verify handover.
   Transitions: approved → active
───────────────────────────────────────────────────────────────────────── */
const verifyHandover = async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found.' });
    }
    if (rental.status !== 'approved') {
      return res.status(400).json({ message: 'Rental must be in approved state for handover.' });
    }
    if (rental.qrUsed) {
      return res.status(400).json({ message: 'QR code has already been used.' });
    }
    if (!qrToken || rental.qrCode !== qrToken) {
      return res.status(400).json({ message: 'Invalid QR code.' });
    }

    // Only the renter (or owner physically present) can verify
    const userId = req.user._id.toString();
    if (rental.renterId.toString() !== userId && rental.ownerId.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    rental.status = 'active';
    rental.qrUsed = true;
    rental.pickupAt = new Date();

    await rental.save();
    res.json({ message: 'Handover verified. Rental is now active.', rental });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/rentals/:id/return
   Owner confirms item return → rental transitions active → completed.
   Also creates a return_confirmed reminder record for notification.
───────────────────────────────────────────────────────────────────────── */
const completeRental = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found.' });
    }
    if (rental.status !== 'active' && rental.status !== 'overdue') {
      return res.status(400).json({ message: 'Rental must be active or overdue to be completed.' });
    }

    const userId = req.user._id.toString();
    // Owner must confirm the return
    if (rental.ownerId.toString() !== userId) {
      return res.status(403).json({ message: 'Only the owner can confirm return.' });
    }

    rental.status = 'completed';
    rental.returnedAt = new Date();
    await rental.save();

    // Notify renter and owner of return completion
    const { sendNotification } = require('../services/notificationService');
    sendNotification(req.app, {
      userId: rental.renterId,
      type: 'transaction_update',
      title: 'Rental Completed! 🎉',
      message: 'Return confirmed by owner! Thank you for participating in campus sharing.',
      relatedId: rental._id,
      relatedModel: 'Rental'
    });
    sendNotification(req.app, {
      userId: rental.ownerId,
      type: 'transaction_update',
      title: 'Rental Completed! 🎉',
      message: 'Item return confirmed! The rental is officially closed.',
      relatedId: rental._id,
      relatedModel: 'Rental'
    });

    // Update sustainability metrics for renter and owner
    computeUserSustainability(rental.renterId).catch((err) => console.error('[sustainability] renter err:', err.message));
    computeUserSustainability(rental.ownerId).catch((err) => console.error('[sustainability] owner err:', err.message));

    res.json({ message: 'Rental completed successfully.', rental });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/rentals/:id/qr
   Returns QR code as base64 PNG data URI — owner uses this to display.
───────────────────────────────────────────────────────────────────────── */
const getRentalQR = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found.' });
    }
    if (!rental.qrCode) {
      return res.status(400).json({ message: 'QR code not generated yet (rental must be approved first).' });
    }

    const userId = req.user._id.toString();
    // Only owner can display QR
    if (rental.ownerId.toString() !== userId) {
      return res.status(403).json({ message: 'Only the owner can view the handover QR code.' });
    }
    if (rental.qrUsed) {
      return res.status(400).json({ message: 'QR code has already been used.' });
    }

    const qrDataUri = await QRCode.toDataURL(rental.qrCode, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });

    res.json({ qrDataUri, token: rental.qrCode });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRental,
  getMyRentals,
  getRentalById,
  updateRentalStatus,
  verifyHandover,
  completeRental,
  getRentalQR,
};
