require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Listing = require('../models/Listing');
const Dispute = require('../models/Dispute');

const seedAdminData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/campusconnect';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding admin test data...');

    // Clear existing test moderation data
    await User.deleteMany({ email: { $in: ['admin@university.edu', 'kajal@university.edu', 'alex@university.edu', 'sarah@university.edu'] } });
    await Category.deleteMany({ slug: { $in: ['textbooks', 'electronics', 'notes-pyq', 'lab-equipment', 'furniture'] } });

    // 1. Seed Users (Admin & Students)
    const adminUser = await User.create({
      email: 'admin@university.edu',
      password: 'Password123!',
      role: 'Administrator',
      isVerified: true,
      profile: {
        name: 'Kajal Varlani (Admin)',
        program: 'Computer Science',
        year: 'Senior',
        contactPreferences: 'email'
      }
    });

    const student1 = await User.create({
      email: 'alex@university.edu',
      password: 'Password123!',
      role: 'Student',
      isVerified: true,
      profile: {
        name: 'Alex Rivera',
        program: 'Electrical Engineering',
        year: 'Junior'
      },
      reputation: { rating: 4.8, reviewsCount: 12 }
    });

    const student2 = await User.create({
      email: 'sarah@university.edu',
      password: 'Password123!',
      role: 'Student',
      isVerified: false,
      status: 'Active',
      profile: {
        name: 'Sarah Connor',
        program: 'Mechanical Engineering',
        year: 'Sophomore'
      },
      reputation: { rating: 4.2, reviewsCount: 5 }
    });

    console.log('Seeded Users: 1 Admin, 2 Students');

    // 2. Seed Categories (FR-6.3)
    const categories = await Category.insertMany([
      { name: 'Textbooks', slug: 'textbooks', description: 'Course books and study guides', requiresModeration: true },
      { name: 'Electronics', slug: 'electronics', description: 'Laptops, calculators, peripherals', requiresModeration: true },
      { name: 'Notes/PYQ', slug: 'notes-pyq', description: 'Previous year question papers & handwritten notes', requiresModeration: true },
      { name: 'Lab Equipment', slug: 'lab-equipment', description: 'Lab coats, drafting kits, tools', requiresModeration: false },
      { name: 'Furniture', slug: 'furniture', description: 'Desks, chairs, mini fridges', requiresModeration: false }
    ]);
    console.log(`Seeded ${categories.length} Categories`);

    // 3. Seed Sample Listings for Moderation Queue (FR-6.1)
    const listings = await Listing.insertMany([
      {
        title: 'Calculus: Early Transcendentals 8th Edition',
        description: 'Used calculus textbook in great condition. Minimal highlighting.',
        category: 'Textbooks',
        condition: 'Good',
        listingType: 'Sell',
        price: 35,
        images: ['https://example.com/calc8th.jpg'],
        seller: student1._id,
        status: 'pending' // Awaiting admin approval
      },
      {
        title: 'Texas Instruments TI-84 Plus CE Graphing Calculator',
        description: 'Color screen, comes with USB charger. Works perfectly.',
        category: 'Electronics',
        condition: 'Like New',
        listingType: 'Rent',
        price: 15,
        images: ['https://example.com/ti84.jpg'],
        seller: student2._id,
        status: 'pending' // Awaiting admin approval
      },
      {
        title: 'Complete Machine Learning Midterm Notes (CS401)',
        description: 'Comprehensive handwritten summaries and past papers.',
        category: 'Notes/PYQ',
        condition: 'Good',
        listingType: 'Sell',
        price: 10,
        images: ['https://example.com/notes.jpg'],
        seller: student1._id,
        status: 'pending'
      },
      {
        title: 'Compact Dorm Mini Fridge 1.7 Cu. Ft.',
        description: 'Clean, cold, runs quiet. Perfect for campus housing.',
        category: 'Furniture',
        condition: 'Good',
        listingType: 'Sell',
        price: 50,
        images: ['https://example.com/fridge.jpg'],
        seller: student2._id,
        status: 'approved',
        moderatedBy: adminUser._id,
        moderatedAt: new Date()
      }
    ]);
    console.log(`Seeded ${listings.length} Sample Listings (3 pending, 1 approved)`);

    // 4. Seed Dispute / Report (FR-6.4)
    const dispute = await Dispute.create({
      title: 'Item condition misrepresented',
      disputeType: 'ListingReport',
      reporter: student1._id,
      reportedUser: student2._id,
      relatedListing: listings[1]._id,
      description: 'Calculator screen has a large crack that was not shown in photos.',
      priority: 'High',
      status: 'pending'
    });
    console.log(`Seeded Sample Dispute #${dispute._id}`);

    console.log('\nSeed completed successfully! Admin test credentials:');
    console.log('Email: admin@university.edu | Password: Password123!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedAdminData();
}

module.exports = seedAdminData;
