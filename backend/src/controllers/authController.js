const User = require('../models/User');
const SustainabilityStat = require('../models/SustainabilityStat');
const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'campusconnect_jwt_secret';
};

const generateAccessToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: '7d',
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (FR-1.1)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { email, password, name, program, year } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check for valid university email domain (FR-1.1, NFR-3.4)
    const normalizedEmail = email.toLowerCase().trim();
    const isEdu = normalizedEmail.endsWith('.edu') || normalizedEmail.endsWith('.ac.in') || normalizedEmail.includes('.edu.');
    if (!isEdu) {
      return res.status(400).json({ message: 'Must use a valid university email address (.edu or .ac.in)' });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      email: normalizedEmail,
      password,
      profile: {
        name: name || '',
        program: program || '',
        year: year || '',
      },
    });

    if (user) {
      // Auto-initialize sustainability stats
      await SustainabilityStat.create({
        userId: user._id,
        itemsReused: 0,
        moneySaved: 0,
        co2SavedKg: 0,
        transactions: 0,
      }).catch(() => {}); // non-blocking

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      res.status(201).json({
        _id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        reputation: user.reputation,
        isVerified: user.isVerified,
        token: accessToken,
        accessToken,
        refreshToken,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token (FR-1.2)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && (await user.matchPassword(password))) {
      if (user.status === 'Suspended') {
        return res.status(403).json({
          message: `Account suspended: ${user.suspensionReason || 'Violation of campus community guidelines'}`,
        });
      }

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      res.json({
        _id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        reputation: user.reputation,
        isVerified: user.isVerified,
        token: accessToken,
        accessToken,
        refreshToken,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh expired access token (FR-1.2)
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const newAccessToken = generateAccessToken(user._id);
    res.json({ accessToken: newAccessToken, token: newAccessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

module.exports = { registerUser, loginUser, refreshToken };
