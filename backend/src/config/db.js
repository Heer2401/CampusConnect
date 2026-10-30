const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campusconnect';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-seed default categories if none exist
    const Category = require('../models/Category');
    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      await Category.insertMany([
        { name: 'Books & Textbooks', slug: 'books-textbooks', sortOrder: 1, icon: '📚' },
        { name: 'Electronics & Gadgets', slug: 'electronics-gadgets', sortOrder: 2, icon: '💻' },
        { name: 'Lab Equipment & Tools', slug: 'lab-equipment-tools', sortOrder: 3, icon: '🔬' },
        { name: 'Stationery & Supplies', slug: 'stationery-supplies', sortOrder: 4, icon: '✏️' },
        { name: 'Cycles & Mobility', slug: 'cycles-mobility', sortOrder: 5, icon: '🚲' },
        { name: 'Sports & Fitness', slug: 'sports-fitness', sortOrder: 6, icon: '⚽' },
        { name: 'Hostel & Room Essentials', slug: 'hostel-room-essentials', sortOrder: 7, icon: '🛏️' },
        { name: 'Other', slug: 'other', sortOrder: 8, icon: '📦' },
      ]);
      console.log('Seeded default campus categories.');
    }
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Make sure your IP address is whitelisted in MongoDB Atlas (Network Access -> Add IP Address -> 0.0.0.0/0 or your current IP).');
    throw error;
  }
};

module.exports = connectDB;

