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
const Transaction = require('../models/Transaction');
const ChatThread = require('../models/ChatThread');
const Message = require('../models/Message');
const QRCode = require('qrcode');
const { randomUUID: uuidv4 } = require('crypto');
const { sendNotification } = require('../services/notificationService');
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
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    if (start < todayMidnight) {
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

    // ── Auto-create / reuse ChatThread & send automated item detail message ──
    let threadId = null;
    const renterName = req.user.profile?.name || req.user.name || req.user.email || 'A student';
    try {
      let thread = await ChatThread.findOne({
        listingId: listing._id,
        participants: { $all: [req.user._id, listing.seller] },
      });

      if (!thread) {
        thread = new ChatThread({
          participants: [req.user._id, listing.seller],
          listingId: listing._id,
          lastMessageAt: new Date(),
          lastMessagePreview: `Rental request for ${listing.title}`,
        });
        await thread.save();
      }

      threadId = thread._id;

      const startStr = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const dueStr = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const diffDays = Math.max(1, Math.round((due - start) / (1000 * 60 * 60 * 24)));
      const periodUnit = listing.rentalPeriod || 'day';

      const systemContent = `🤝 RENTAL REQUEST PLACED\n\n` +
        `📦 Item: ${listing.title}\n` +
        `🏷️ Type: RENT\n` +
        `📅 Duration: ${diffDays} ${diffDays === 1 ? 'day' : 'days'} (${startStr} to ${dueStr})\n` +
        `💰 Rate: ₹${rental.price}/${periodUnit}${rental.deposit ? ` · Deposit: ₹${rental.deposit}` : ''}\n` +
        `👤 Renter: ${renterName}\n` +
        `🆔 Rental Ref: #${rental._id.toString().slice(-6)}\n` +
        (message ? `💬 Note: "${message}"\n\n` : '\n') +
        `📍 Meetup & Handover Coordination:\n` +
        `Owner can approve or reject this rental request. Once approved, coordinate campus meetup and verify with the 6-digit Meetup PIN!`;

      const msg = new Message({
        threadId: thread._id,
        senderId: req.user._id,
        content: systemContent,
        type: 'system',
        metadata: {
          rentalId: rental._id,
          listingId: listing._id,
          type: 'rental_request',
          status: 'requested',
          item: listing.title,
          dates: `${startStr} – ${dueStr}`,
          duration: `${diffDays} days`,
          amount: `₹${rental.price}/${periodUnit}`,
          deposit: rental.deposit || 0,
          renterName,
        },
        readAt: null,
      });
      await msg.save();

      thread.lastMessageAt = new Date();
      thread.lastMessagePreview = `Rental Request: ${listing.title}`;
      await thread.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`thread:${thread._id}`).emit('chat_message', msg);
        io.to(`user:${listing.seller.toString()}`).emit('chat_message', msg);
        io.to(`user:${req.user._id.toString()}`).emit('chat_message', msg);
      }
    } catch (chatErr) {
      console.error('[createRental] Chat creation error:', chatErr.message);
    }

    // Send notifications to owner and renter
    sendNotification(req.app, {
      userId: listing.seller,
      type: 'rental',
      title: 'New Rental Request! 📦',
      message: `${renterName} requested to rent "${listing.title}". Review in your chat or dashboard!`,
      relatedId: rental._id,
      relatedModel: 'Rental'
    });
    sendNotification(req.app, {
      userId: req.user._id,
      type: 'rental',
      title: 'Rental Request Submitted! 📦',
      message: `Your request to rent "${listing.title}" is submitted. Coordinate in chat!`,
      relatedId: rental._id,
      relatedModel: 'Rental'
    });

    res.status(201).json({ message: 'Rental request submitted.', rental, threadId });
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

    let transactionId = null;
    if (status === 'approved') {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      rental.handoverPin = pin;
      rental.handoverPinGeneratedAt = new Date();
      rental.qrCode = pin;
      rental.qrUsed = false;

      // Schedule reminders for renter
      await scheduleReminders(rental);

      // Create / link Transaction for PIN handover like sell
      let txn = await Transaction.findOne({ rentalId: rental._id });
      if (!txn) {
        txn = await Transaction.create({
          listingId: rental.listingId,
          buyerId: rental.renterId,
          sellerId: rental.ownerId,
          type: 'rent',
          amount: (rental.price || 0) + (rental.deposit || 0),
          rentalId: rental._id,
          handoverPin: pin,
          handoverPinGeneratedAt: new Date(),
          status: 'pending',
        });
      } else {
        txn.handoverPin = pin;
        txn.handoverPinGeneratedAt = new Date();
        txn.status = 'pending';
        await txn.save();
      }
      rental.transactionId = txn._id;
      transactionId = txn._id;

      // Notify renter
      sendNotification(req.app, {
        userId: rental.renterId,
        type: 'transaction_update',
        title: 'Rental Request Approved! 🎉',
        message: 'Your rental request has been approved! Coordinate campus meetup and use the 6-digit PIN for handover.',
        relatedId: rental._id,
        relatedModel: 'Rental'
      });

      // Post chat notification into thread
      try {
        const thread = await ChatThread.findOne({
          listingId: rental.listingId,
          participants: { $all: [rental.renterId, rental.ownerId] },
        });
        if (thread) {
          const approvalMsg = new Message({
            threadId: thread._id,
            senderId: req.user._id,
            content: `🎉 RENTAL APPROVED\n\nThe owner approved the rental! A 6-digit Meetup PIN is active for this handover.\n\n👉 Proceed to Transactions to view your Meetup PIN and confirm item receipt upon handover.`,
            type: 'system',
            metadata: {
              rentalId: rental._id,
              transactionId: txn._id,
              type: 'rental_approved',
              status: 'approved',
            },
            readAt: null,
          });
          await approvalMsg.save();

          await Message.updateMany(
            { threadId: thread._id, 'metadata.rentalId': rental._id },
            { $set: { 'metadata.status': 'approved' } }
          );

          thread.lastMessageAt = new Date();
          thread.lastMessagePreview = `Rental Approved · Meetup PIN Active`;
          await thread.save();

          const io = req.app.get('io');
          if (io) {
            io.to(`thread:${thread._id}`).emit('chat_message', approvalMsg);
            io.to(`user:${rental.renterId.toString()}`).emit('chat_message', approvalMsg);
            io.to(`user:${rental.ownerId.toString()}`).emit('chat_message', approvalMsg);
          }
        }
      } catch (err) {
        console.error('[rentalController] Chat notification error:', err.message);
      }
    } else if (status === 'cancelled') {
      sendNotification(req.app, {
        userId: isOwner ? rental.renterId : rental.ownerId,
        type: 'transaction_update',
        title: 'Rental Request Cancelled',
        message: isOwner ? 'The owner declined the rental request.' : 'The renter cancelled their rental request.',
        relatedId: rental._id,
        relatedModel: 'Rental'
      });
      // Un-reserve the listing so it is available again
      await Listing.findByIdAndUpdate(rental.listingId, { status: 'active' });
      if (rental.transactionId) {
        await Transaction.findByIdAndUpdate(rental.transactionId, { status: 'cancelled' });
      }
      try {
        await Message.updateMany(
          { 'metadata.rentalId': rental._id },
          { $set: { 'metadata.status': 'cancelled' } }
        );
      } catch (_) {}
    }

    await rental.save();
    res.json({ message: `Rental status updated to '${status}'.`, rental, transactionId });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/rentals/:id/handover
   Renter submits the 6-digit PIN (or QR token) to verify handover.
   Transitions: approved → active
───────────────────────────────────────────────────────────────────────── */
const verifyHandover = async (req, res, next) => {
  try {
    const { qrToken, pin } = req.body;
    const submittedCode = (pin || qrToken || '').toString().trim();
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found.' });
    }
    if (rental.status !== 'approved') {
      return res.status(400).json({ message: 'Rental must be in approved state for handover.' });
    }
    if (rental.qrUsed) {
      return res.status(400).json({ message: 'Handover has already been verified.' });
    }
    const validPin = (rental.handoverPin || rental.qrCode || '').toString().trim();
    if (!submittedCode || (validPin && submittedCode !== validPin)) {
      return res.status(400).json({ message: 'Invalid Meetup PIN.' });
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

    // Also complete the linked transaction if any
    if (rental.transactionId) {
      await Transaction.findByIdAndUpdate(rental.transactionId, {
        status: 'completed',
        completedAt: new Date(),
        buyerConfirmedAt: new Date(),
        sellerConfirmedAt: new Date(),
      });
    }

    await Listing.findByIdAndUpdate(rental.listingId, { status: 'rented' });

    sendNotification(req.app, {
      userId: rental.renterId,
      type: 'transaction_update',
      title: 'Handover Confirmed! 🎉',
      message: 'Item received! Rental is now active.',
      relatedId: rental._id,
      relatedModel: 'Rental'
    });
    sendNotification(req.app, {
      userId: rental.ownerId,
      type: 'transaction_update',
      title: 'Handover Confirmed! 🎉',
      message: 'Item handed over to renter. Rental is now active.',
      relatedId: rental._id,
      relatedModel: 'Rental'
    });

    res.json({ message: 'Handover verified successfully. Rental is now active.', rental });
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

/**
 * GET /api/rentals/listing/:listingId/reserved-dates
 * Returns all active/approved/requested rental date ranges for a listing
 * so frontend calendar can grey out unavailable dates.
 */
const getListingReservedDates = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const rentals = await Rental.find({
      listingId,
      status: { $in: ['approved', 'active', 'requested'] },
      dueDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }).select('startDate dueDate status');

    const reservedRanges = rentals.map((r) => ({
      startDate: r.startDate,
      dueDate: r.dueDate,
      status: r.status,
    }));

    res.json({ success: true, data: reservedRanges });
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
  getListingReservedDates,
};

