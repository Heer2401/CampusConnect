/**
 * Charmi Bhayani (202512028) — Rental & Transaction Management Lead
 * transactionController.js
 *
 * Covers: FR-2.7, FR-1.6, AC-8
 *  POST   /api/transactions              — Initiate a buy/exchange/giveaway transaction
 *  GET    /api/transactions/my           — Current user's transactions
 *  GET    /api/transactions/:id          — Transaction details
 *  PATCH  /api/transactions/:id/confirm  — Buyer or seller confirms receipt
 *  PATCH  /api/transactions/:id/cancel   — Cancel transaction
 */

const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const ChatThread = require('../models/ChatThread');
const Message = require('../models/Message');
const { sendNotification } = require('../services/notificationService');
const { computeUserSustainability } = require('./sustainabilityController');


/* ─────────────────────────────────────────────────────────────────────────
   POST /api/transactions
   Buyer initiates a sale, exchange, or giveaway transaction.
───────────────────────────────────────────────────────────────────────── */
const createTransaction = async (req, res, next) => {
  try {
    const { listingId, type, exchangeListingId } = req.body;

    if (!listingId || !type) {
      return res.status(400).json({ message: 'listingId and type are required.' });
    }

    const allowedTypes = ['sale', 'exchange', 'giveaway'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${allowedTypes.join(', ')}` });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }
    if (!['approved', 'active'].includes(listing.status)) {
      return res.status(400).json({ message: 'Listing is not currently available for transactions.' });
    }

    // typeMap keys MUST be lowercase — listing.listingType is stored lowercase
    const typeMap = { sell: 'sale', exchange: 'exchange', giveaway: 'giveaway' };
    if (typeMap[listing.listingType] !== type) {
      return res.status(400).json({ message: `Listing type '${listing.listingType}' does not match transaction type '${type}'.` });
    }

    const sellerId = listing.seller || listing.owner;
    if (sellerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot buy your own listing.' });
    }

    // Check for duplicate pending transaction
    const existing = await Transaction.findOne({
      listingId,
      buyerId: req.user._id,
      status: { $in: ['pending', 'payment_held'] },
    });
    if (existing) {
      return res.status(409).json({ message: 'You already have an active transaction for this listing.' });
    }

    const txn = await Transaction.create({
      listingId,
      buyerId: req.user._id,
      sellerId,
      type,
      amount: listing.price || 0,
      exchangeListingId: type === 'exchange' ? exchangeListingId || null : null,
      status: 'pending',
    });

    // Reserve the listing so no one else can initiate a concurrent transaction
    await Listing.findByIdAndUpdate(listingId, { status: 'reserved' });

    // ── Auto-create / reuse ChatThread & send notification message ──
    let threadId = null;
    try {
      let thread = await ChatThread.findOne({
        listingId: listing._id,
        participants: { $all: [req.user._id, sellerId] },
      });

      if (!thread) {
        thread = new ChatThread({
          participants: [req.user._id, sellerId],
          listingId: listing._id,
          lastMessageAt: new Date(),
          lastMessagePreview: `New ${type.toUpperCase()} order for ${listing.title}`,
        });
        await thread.save();
      }

      threadId = thread._id;

      const buyerName = req.user.profile?.name || req.user.name || req.user.email || 'A buyer';
      const systemContent = `🤝 ORDER REQUEST PLACED\n\n` +
        `📦 Item: ${listing.title}\n` +
        `🏷️ Type: ${type.toUpperCase()}\n` +
        `💰 Amount: ₹${listing.price || 0}\n` +
        `👤 Buyer: ${buyerName}\n` +
        `🆔 Order ID: #${txn._id.toString().slice(-6)}\n\n` +
        `📍 Meetup & Handover Coordination:\n` +
        `Please coordinate here to agree on a campus meetup location and time.\n` +
        `During meetup, the seller taps "Show PIN" on their Escrow Dashboard and the buyer enters the 6-digit PIN to confirm receipt!`;

      const msg = new Message({
        threadId: thread._id,
        senderId: req.user._id,
        content: systemContent,
        type: 'system',
        readAt: null,
      });
      await msg.save();

      thread.lastMessageAt = new Date();
      thread.lastMessagePreview = `Order Request: ${listing.title}`;
      await thread.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`thread:${thread._id}`).emit('chat_message', msg);
        io.to(`user:${sellerId.toString()}`).emit('chat_message', msg);
        io.to(`user:${req.user._id.toString()}`).emit('chat_message', msg);
      }

      // Notify Seller
      await sendNotification(req.app, {
        userId: sellerId,
        type: 'order',
        title: 'New Order Request! 🛍️',
        message: `${buyerName} placed an order for "${listing.title}". Chat to coordinate campus meetup!`,
        relatedId: txn._id,
        relatedModel: 'Transaction',
      });

      // Notify Buyer (instant order confirmation)
      await sendNotification(req.app, {
        userId: req.user._id,
        type: 'order',
        title: 'Order Placed Successfully! 🛍️',
        message: `Your order for "${listing.title}" (₹${listing.price || 0}) is confirmed! Coordinate meetup with the seller in chat.`,
        relatedId: txn._id,
        relatedModel: 'Transaction',
      });
    } catch (err) {
      console.error('[createTransaction] Error setting up chat/notification:', err.message);
    }

    res.status(201).json({
      message: 'Transaction initiated.',
      transaction: txn,
      threadId,
    });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/transactions/my
   Returns transactions where user is buyer or seller.
───────────────────────────────────────────────────────────────────────── */
const getMyTransactions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { role, status, page = 1, limit = 20 } = req.query;

    const query = {};

    if (role === 'buyer') {
      query.buyerId = userId;
    } else if (role === 'seller') {
      query.sellerId = userId;
    } else {
      query.$or = [{ buyerId: userId }, { sellerId: userId }];
    }

    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('listingId', 'title images price listingType')
        .populate('buyerId', 'email profile.name')
        .populate('sellerId', 'email profile.name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(query),
    ]);

    const sanitized = transactions.map((t) => {
      const doc = t.toObject();
      const isSeller =
        doc.sellerId?._id?.toString() === userId.toString() ||
        doc.sellerId?.toString() === userId.toString();
      if (!isSeller) {
        delete doc.handoverPin;
        delete doc.handoverPinGeneratedAt;
      }
      return doc;
    });

    res.json({
      transactions: sanitized,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/transactions/:id
───────────────────────────────────────────────────────────────────────── */
const getTransactionById = async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id)
      .populate('listingId', 'title description images price category listingType')
      .populate('buyerId', 'email profile reputation')
      .populate('sellerId', 'email profile reputation');

    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const userId = req.user._id.toString();
    const isParty =
      txn.buyerId._id.toString() === userId ||
      txn.sellerId._id.toString() === userId ||
      req.user.role === 'Administrator';

    if (!isParty) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const doc = txn.toObject();
    const isSeller =
      doc.sellerId?._id?.toString() === userId ||
      doc.sellerId?.toString() === userId;
    if (!isSeller) {
      delete doc.handoverPin;
      delete doc.handoverPinGeneratedAt;
    }

    res.json(doc);
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /api/transactions/:id/confirm
   Buyer or seller confirms receipt.
   When both confirm → status becomes 'completed'.
───────────────────────────────────────────────────────────────────────── */
const confirmTransaction = async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (!['pending', 'payment_held', 'buyer_confirmed', 'seller_confirmed'].includes(txn.status)) {
      return res.status(400).json({ message: `Cannot confirm a transaction in '${txn.status}' state.` });
    }

    const userId = req.user._id.toString();
    const isBuyer = txn.buyerId.toString() === userId;
    const isSeller = txn.sellerId.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const now = new Date();

    if (isBuyer && !txn.buyerConfirmedAt) {
      txn.buyerConfirmedAt = now;
      if (txn.status === 'seller_confirmed') {
        txn.status = 'completed';
        txn.completedAt = now;
      } else {
        txn.status = 'buyer_confirmed';
      }
    } else if (isSeller && !txn.sellerConfirmedAt) {
      txn.sellerConfirmedAt = now;
      if (txn.status === 'buyer_confirmed') {
        txn.status = 'completed';
        txn.completedAt = now;
      } else {
        txn.status = 'seller_confirmed';
      }
    } else {
      return res.status(400).json({ message: 'You have already confirmed this transaction.' });
    }

    if (txn.status === 'completed') {
      const finalStatus = txn.type === 'sale' ? 'sold' : txn.type === 'exchange' ? 'exchanged' : 'given_away';
      await Listing.findByIdAndUpdate(txn.listingId, { status: finalStatus });
      if (txn.exchangeListingId) {
        await Listing.findByIdAndUpdate(txn.exchangeListingId, { status: 'exchanged' });
      }

      // Notify both parties of completed deal
      sendNotification(req.app, {
        userId: txn.buyerId,
        type: 'transaction_update',
        title: 'Transaction Completed! 🎉',
        message: `Deal for transaction #${txn._id.toString().slice(-6)} has been completed.`,
        relatedId: txn._id,
        relatedModel: 'Transaction',
      });
      sendNotification(req.app, {
        userId: txn.sellerId,
        type: 'transaction_update',
        title: 'Transaction Completed! 🎉',
        message: `Deal for transaction #${txn._id.toString().slice(-6)} has been completed.`,
        relatedId: txn._id,
        relatedModel: 'Transaction',
      });
    } else {
      const otherPartyId = isBuyer ? txn.sellerId : txn.buyerId;
      sendNotification(req.app, {
        userId: otherPartyId,
        type: 'transaction_update',
        title: 'Handover Confirmed',
        message: `${isBuyer ? 'Buyer' : 'Seller'} confirmed receipt for transaction #${txn._id.toString().slice(-6)}.`,
        relatedId: txn._id,
        relatedModel: 'Transaction',
      });
    }

    await txn.save();
    res.json({ message: `Transaction ${txn.status === 'completed' ? 'completed' : 'confirmation recorded'}.`, transaction: txn });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/transactions/:id/generate-pin
   Seller generates a 6-digit PIN for in-person meetup verification.
───────────────────────────────────────────────────────────────────────── */
const generateHandoverPin = async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const userId = req.user._id.toString();
    if (txn.sellerId.toString() !== userId) {
      return res.status(403).json({ message: 'Only the seller can generate the handover PIN.' });
    }

    if (['completed', 'cancelled', 'refunded'].includes(txn.status)) {
      return res.status(400).json({ message: `Cannot generate PIN for transaction in '${txn.status}' state.` });
    }

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    txn.handoverPin = pin;
    txn.handoverPinGeneratedAt = new Date();
    await txn.save();

    res.json({
      message: 'Handover PIN generated successfully. Show this code to the buyer during in-person meetup.',
      pin,
      transaction: txn,
    });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/transactions/:id/verify-pin
   Buyer enters the 6-digit PIN shown by seller to confirm receipt & complete.
───────────────────────────────────────────────────────────────────────── */
const verifyHandoverPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin || !pin.trim()) {
      return res.status(400).json({ message: 'A 6-digit PIN is required.' });
    }

    const txn = await Transaction.findById(req.params.id);
    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const userId = req.user._id.toString();
    if (txn.buyerId.toString() !== userId) {
      return res.status(403).json({ message: 'Only the buyer can verify the handover PIN.' });
    }

    if (txn.status === 'completed') {
      return res.status(400).json({ message: 'This transaction is already completed.' });
    }

    if (!txn.handoverPin) {
      return res.status(400).json({ message: 'The seller has not generated a handover PIN yet. Please ask the seller to tap "Generate PIN" on their dashboard.' });
    }

    if (txn.handoverPin.trim() !== pin.trim()) {
      return res.status(400).json({ message: 'Incorrect PIN. Please verify the 6-digit code shown on the seller\'s screen.' });
    }

    const now = new Date();
    txn.status = 'completed';
    txn.buyerConfirmedAt = now;
    txn.sellerConfirmedAt = txn.sellerConfirmedAt || now;
    txn.completedAt = now;
    await txn.save();

    // Update listing status and linked rental if applicable
    if (txn.type === 'rent') {
      await Listing.findByIdAndUpdate(txn.listingId, { status: 'rented' });
      if (txn.rentalId) {
        const Rental = require('../models/Rental');
        await Rental.findByIdAndUpdate(txn.rentalId, {
          status: 'active',
          pickupAt: now,
          qrUsed: true,
        });
      }
    } else {
      const finalStatus = txn.type === 'sale' ? 'sold' : txn.type === 'exchange' ? 'exchanged' : 'given_away';
      await Listing.findByIdAndUpdate(txn.listingId, { status: finalStatus });
      if (txn.exchangeListingId) {
        await Listing.findByIdAndUpdate(txn.exchangeListingId, { status: 'exchanged' });
      }
    }

    // Send notification to seller
    await sendNotification(req.app, {
      userId: txn.sellerId,
      type: 'transaction_update',
      title: 'Handover Completed! 🎉',
      message: `Meetup PIN verified! Transaction #${txn._id.toString().slice(-6)} is marked as completed.`,
      relatedId: txn._id,
      relatedModel: 'Transaction',
    });

    // Send notification to buyer
    await sendNotification(req.app, {
      userId: txn.buyerId,
      type: 'transaction_update',
      title: 'Purchase Completed! 🎉',
      message: `Meetup handover verified for transaction #${txn._id.toString().slice(-6)}. Deal completed!`,
      relatedId: txn._id,
      relatedModel: 'Transaction',
    });

    // Update live sustainability impact metrics for both parties
    computeUserSustainability(txn.buyerId).catch((err) => console.error('[sustainability] buyer err:', err.message));
    computeUserSustainability(txn.sellerId).catch((err) => console.error('[sustainability] seller err:', err.message));

    res.json({
      message: 'Handover verified successfully! Transaction is now completed.',
      transaction: txn,
    });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /api/transactions/:id/cancel
   Either party can cancel a pending transaction.
───────────────────────────────────────────────────────────────────────── */
const cancelTransaction = async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (!['pending', 'payment_held'].includes(txn.status)) {
      return res.status(400).json({ message: `Cannot cancel a transaction in '${txn.status}' state.` });
    }

    const userId = req.user._id.toString();
    const isParty =
      txn.buyerId.toString() === userId ||
      txn.sellerId.toString() === userId ||
      req.user.role === 'Administrator';

    if (!isParty) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    txn.status = 'cancelled';
    await txn.save();

    // Un-reserve the listing so it becomes available again
    await Listing.findByIdAndUpdate(txn.listingId, { status: 'active' });

    res.json({ message: 'Transaction cancelled.', transaction: txn });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getMyTransactions,
  getTransactionById,
  confirmTransaction,
  generateHandoverPin,
  verifyHandoverPin,
  cancelTransaction,
};
