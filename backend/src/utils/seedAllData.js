// NOTICE: Development-only test seed script.
// This utility seeds initial categories and sample listings with a development test user.
// It must NOT be used in production environments.

const mongoose = require('mongoose');
const Category = require('../models/Category');
const Listing = require('../models/Listing');
const User = require('../models/User');
const seedCategories = require('./seedCategories');

const seedAllData = async () => {
  console.log('--- Starting Database Seeding ---');
  await seedCategories();

  // Find or create default student user for listings
  let user = await User.findOne({ email: 'nishka@campus.edu' });
  if (!user) {
    user = await User.create({
      email: 'nishka@campus.edu',
      password: 'Password123!',
      role: 'Student',
      isVerified: true,
      profile: {
        name: 'Nishka Shah',
        program: 'Computer Science',
        year: 'Junior'
      }
    });
  }

  const labCategory = await Category.findOne({ slug: 'lab-equipment' });
  const booksCategory = await Category.findOne({ slug: 'books-textbooks' });
  const electronicsCategory = await Category.findOne({ slug: 'electronics-gadgets' });
  const hostelCategory = await Category.findOne({ slug: 'hostel-room-essentials' });

  const sampleListings = [
    {
      title: 'Digital Multimeter with Test Probes',
      description: 'Used for EC101 circuit analysis lab. Includes original probes, 9V battery, and user manual.',
      category: labCategory?._id,
      listingType: 'sell',
      price: 350,
      condition: 'good',
      owner: user._id,
      status: 'active',
      images: [{ url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60', isPrimary: true }]
    },
    {
      title: 'Chemistry Lab Coat & Safety Goggles',
      description: 'White cotton lab coat (Size M) and anti-fog splash safety goggles. Used for one semester in Chem Lab.',
      category: labCategory?._id,
      listingType: 'sell',
      price: 200,
      condition: 'like_new',
      owner: user._id,
      status: 'active',
      images: [{ url: 'https://images.unsplash.com/photo-1562789233-775b82d35c16?w=500&auto=format&fit=crop&q=60', isPrimary: true }]
    },
    {
      title: 'Engineering Mini Drafting Board & Instruments Set',
      description: 'Complete drawing kit for engineering graphics coursework. Includes mini drafter, scale, and compass set.',
      category: labCategory?._id,
      listingType: 'rent',
      rentalRate: 50,
      rentalPeriod: 'week',
      condition: 'good',
      owner: user._id,
      status: 'active',
      images: [{ url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=500&auto=format&fit=crop&q=60', isPrimary: true }]
    },
    {
      title: 'Discrete Mathematics and Its Applications (8th Ed)',
      description: 'Hardcover textbook by Kenneth Rosen. Essential for CS students. Crisp pages with zero torn leaves.',
      category: booksCategory?._id,
      listingType: 'sell',
      price: 450,
      condition: 'good',
      owner: user._id,
      status: 'active',
      images: [{ url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60', isPrimary: true }]
    },
    {
      title: 'Scientific Calculator Casio fx-991EX Classwiz',
      description: 'High-resolution natural textbook display calculator. Perfect for semester exams.',
      category: electronicsCategory?._id,
      listingType: 'sell',
      price: 650,
      condition: 'like_new',
      owner: user._id,
      status: 'active',
      images: [{ url: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=500&auto=format&fit=crop&q=60', isPrimary: true }]
    },
    {
      title: 'Rechargeable Desk Study Lamp',
      description: '3 color temperatures and step-less dimming desk lamp for hostel rooms. USB rechargeable.',
      category: hostelCategory?._id,
      listingType: 'giveaway',
      price: 0,
      condition: 'good',
      owner: user._id,
      status: 'active',
      images: [{ url: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=500&auto=format&fit=crop&q=60', isPrimary: true }]
    }
  ];

  for (const item of sampleListings) {
    if (item.category) {
      await Listing.findOneAndUpdate(
        { title: item.title },
        { $set: item },
        { upsert: true, returnDocument: 'after' }
      );
    }
  }

  console.log(`Seeded ${sampleListings.length} sample active marketplace listings!`);
};

if (require.main === module) {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campusconnect_dev';
  mongoose.connect(uri)
    .then(() => seedAllData())
    .then(() => {
      console.log('All seed data applied successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error seeding data:', err);
      process.exit(1);
    });
}

module.exports = seedAllData;
