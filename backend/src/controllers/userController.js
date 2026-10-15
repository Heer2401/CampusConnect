/**
 * Dhrumil Doshi (202512088) — Authentication & User Management Lead
 * userController.js
 * 
 * Implements FR-1.4 (User profile management) and FR-1.6 (Payment method management)
 * adhering to CampusConnect OpenAPI Specification.
 */

const User = require('../models/User');
const PaymentMethod = require('../models/PaymentMethod');

// @desc    Get current user profile (FR-1.4)
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile || {},
      reputation: user.reputation || { rating: 0, reviewsCount: 0 },
      isVerified: user.isVerified,
      status: user.status,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile (FR-1.4)
// @route   PATCH /api/users/me
// @access  Private
const updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, program, year, contactPreferences } = req.body;

    user.profile = {
      name: name !== undefined ? name : user.profile?.name,
      program: program !== undefined ? program : user.profile?.program,
      year: year !== undefined ? year : user.profile?.year,
      contactPreferences: contactPreferences !== undefined ? contactPreferences : user.profile?.contactPreferences,
    };

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
      profile: updatedUser.profile,
      reputation: updatedUser.reputation,
      isVerified: updatedUser.isVerified,
      status: updatedUser.status,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get saved payment methods for current user (FR-1.6)
// @route   GET /api/users/me/payment-methods
// @access  Private
const getPaymentMethods = async (req, res, next) => {
  try {
    const methods = await PaymentMethod.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.json(methods);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a payment method (FR-1.6)
// @route   POST /api/users/me/payment-methods
// @access  Private
const addPaymentMethod = async (req, res, next) => {
  try {
    const { type, label, details = {}, isDefault = false } = req.body;

    if (!type || !label) {
      return res.status(400).json({ message: 'Payment method type and label are required' });
    }

    const existingCount = await PaymentMethod.countDocuments({ userId: req.user._id });
    const shouldBeDefault = isDefault || existingCount === 0;

    if (shouldBeDefault) {
      await PaymentMethod.updateMany(
        { userId: req.user._id },
        { $set: { isDefault: false } }
      );
    }

    const newMethod = await PaymentMethod.create({
      userId: req.user._id,
      type,
      label,
      details,
      isDefault: shouldBeDefault,
    });

    res.status(201).json(newMethod);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a payment method (FR-1.6)
// @route   DELETE /api/users/me/payment-methods/:id
// @access  Private
const deletePaymentMethod = async (req, res, next) => {
  try {
    const method = await PaymentMethod.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!method) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    const wasDefault = method.isDefault;
    await PaymentMethod.findByIdAndDelete(req.params.id);

    // If deleted method was default, make the most recent remaining one default
    if (wasDefault) {
      const remaining = await PaymentMethod.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (remaining) {
        remaining.isDefault = true;
        await remaining.save();
      }
    }

    res.json({ message: 'Payment method removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Set default payment method (FR-1.6)
// @route   PATCH /api/users/me/payment-methods/:id/default
// @access  Private
const setDefaultPaymentMethod = async (req, res, next) => {
  try {
    const method = await PaymentMethod.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!method) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    await PaymentMethod.updateMany(
      { userId: req.user._id },
      { $set: { isDefault: false } }
    );

    method.isDefault = true;
    await method.save();

    res.json(method);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
};
