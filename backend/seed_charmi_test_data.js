/**
 * Seed script for testing Charmi Bhayani's Rental & Transaction endpoints
 * Run: node seed_charmi_test_data.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./src/models/User');
const Listing = require('./src/models/Listing');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campusconnect';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

function generateToken(id) {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(' connected to MongoDB:', MONGO_URI);

    // 1. Ensure Owner User
    let owner = await User.findOne({ email: 'owner@university.edu' });
    if (!owner) {
      owner = await User.create({
        email: 'owner@university.edu',
        password: 'Password123!',
        role: 'Student',
      });
      console.log(' Created Owner: owner@university.edu');
    }

    // 2. Ensure Renter User
    let renter = await User.findOne({ email: 'renter@university.edu' });
    if (!renter) {
      renter = await User.create({
        email: 'renter@university.edu',
        password: 'Password123!',
        role: 'Student',
      });
      console.log(' Created Renter: renter@university.edu');
    }

    // 3. Create approved Rent listing
    let rentListing = await Listing.findOne({ title: 'TI-84 Plus Graphing Calculator', seller: owner._id });
    if (!rentListing) {
      rentListing = await Listing.create({
        title: 'TI-84 Plus Graphing Calculator',
        description: 'Perfect for calculus and stats. Includes USB cable and case.',
        category: 'Electronics',
        condition: 'Good',
        listingType: 'Rent',
        price: 15,
        seller: owner._id,
        status: 'approved',
      });
      console.log(' Created approved Rent listing');
    }

    // 4. Create approved Sell listing
    let sellListing = await Listing.findOne({ title: 'Engineering Mechanics Dynamics 14th Ed', seller: owner._id });
    if (!sellListing) {
      sellListing = await Listing.create({
        title: 'Engineering Mechanics Dynamics 14th Ed',
        description: 'Hardcover textbook in great condition. No highlighting.',
        category: 'Textbooks',
        condition: 'Like New',
        listingType: 'Sell',
        price: 45,
        seller: owner._id,
        status: 'approved',
      });
      console.log(' Created approved Sell listing');
    }

    const ownerToken = generateToken(owner._id);
    const renterToken = generateToken(renter._id);

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log(' POSTMAN TEST CREDENTIALS & IDs (Ready to copy-paste):');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('Owner Token  (owner@university.edu):\nBearer ' + ownerToken);
    console.log('\nRenter Token (renter@university.edu):\nBearer ' + renterToken);
    console.log('\nRent Listing ID (for /api/rentals):\n' + rentListing._id);
    console.log('\nSell Listing ID (for /api/transactions):\n' + sellListing._id);
    console.log('════════════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error(' Error seeding data:', err);
    process.exit(1);
  }
}

seed();
