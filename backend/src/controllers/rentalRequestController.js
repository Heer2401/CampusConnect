/**
 * Charmi Bhayani (202512028) — Rental & Transaction Management
 * rentalRequestController.js
 *
 * POST   /api/rental-requests           — Student posts a need (no listing required)
 * GET    /api/rental-requests/my        — My own requests
 * GET    /api/rental-requests           — Browse all open requests (any logged-in user)
 * PATCH  /api/rental-requests/:id/cancel — Requester cancels their own request
 */

const RentalRequest = require('../models/RentalRequest');

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/rental-requests
   A student posts "I need <item> from <startDate> to <dueDate>"
───────────────────────────────────────────────────────────────────────── */
const createRentalRequest = async (req, res, next) => {
  try {
    const { itemName, description, category, startDate, dueDate, budgetPerDay } = req.body;

    if (!itemName || !startDate || !dueDate) {
      return res.status(400).json({ message: 'itemName, startDate and dueDate are required.' });
    }

    const start = new Date(startDate);
    const due   = new Date(dueDate);

    if (isNaN(start) || isNaN(due)) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }
    if (start >= due) {
      return res.status(400).json({ message: 'startDate must be before dueDate.' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return res.status(400).json({ message: 'startDate cannot be in the past.' });
    }

    const rentalRequest = await RentalRequest.create({
      requesterId: req.user._id,
      itemName: itemName.trim(),
      description: description?.trim() || '',
      category:    category?.trim()    || 'Other',
      startDate:   start,
      dueDate:     due,
      budgetPerDay: budgetPerDay ? Number(budgetPerDay) : null,
      status: 'open',
    });

    res.status(201).json({ message: 'Rental request posted successfully.', rentalRequest });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/rental-requests/my
   Returns the logged-in user's own requests (all statuses)
───────────────────────────────────────────────────────────────────────── */
const getMyRentalRequests = async (req, res, next) => {
  try {
    const requests = await RentalRequest.find({ requesterId: req.user._id })
      .populate('requesterId', 'email profile.name')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/rental-requests
   Browse all OPEN requests from the community (potential owners can see what's needed)
───────────────────────────────────────────────────────────────────────── */
const getAllRentalRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Filter out the logged in user's own requests so owners only see requests from other students
    const filter = {
      status: 'open',
      requesterId: { $ne: req.user._id },
    };

    const [requests, total] = await Promise.all([
      RentalRequest.find(filter)
        .populate('requesterId', 'email profile.name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      RentalRequest.countDocuments(filter),
    ]);

    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /api/rental-requests/:id/cancel
   Requester cancels their own open request
───────────────────────────────────────────────────────────────────────── */
const cancelRentalRequest = async (req, res, next) => {
  try {
    const rentalRequest = await RentalRequest.findById(req.params.id);

    if (!rentalRequest) {
      return res.status(404).json({ message: 'Rental request not found.' });
    }
    if (rentalRequest.requesterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only cancel your own requests.' });
    }
    if (rentalRequest.status !== 'open') {
      return res.status(400).json({ message: `Cannot cancel a request with status '${rentalRequest.status}'.` });
    }

    rentalRequest.status = 'cancelled';
    await rentalRequest.save();

    res.json({ message: 'Rental request cancelled.', rentalRequest });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRentalRequest,
  getMyRentalRequests,
  getAllRentalRequests,
  cancelRentalRequest,
};
