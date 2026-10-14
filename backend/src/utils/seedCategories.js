const mongoose = require('mongoose');
const Category = require('../models/Category');

const categories = [
  { name: 'Books & Textbooks', slug: 'books-textbooks', sortOrder: 1 },
  { name: 'Notes & Study Material', slug: 'notes-study-material', sortOrder: 2 },
  { name: 'Question Papers', slug: 'question-papers', sortOrder: 3 },
  { name: 'Electronics & Gadgets', slug: 'electronics-gadgets', sortOrder: 4 },
  { name: 'Lab Equipment', slug: 'lab-equipment', sortOrder: 5 },
  { name: 'Hostel & Room Essentials', slug: 'hostel-room-essentials', sortOrder: 6 },
  { name: 'Furniture', slug: 'furniture', sortOrder: 7 },
  { name: 'Clothing & Accessories', slug: 'clothing-accessories', sortOrder: 8 },
  { name: 'Sports & Fitness', slug: 'sports-fitness', sortOrder: 9 },
  { name: 'Cycles & Transport', slug: 'cycles-transport', sortOrder: 10 },
  { name: 'Stationery', slug: 'stationery', sortOrder: 11 },
  { name: 'Musical Instruments', slug: 'musical-instruments', sortOrder: 12 },
  { name: 'Event/Costume Items', slug: 'event-costume-items', sortOrder: 13 },
  { name: 'Others', slug: 'others', sortOrder: 14 }
];

const seedCategories = async () => {
  for (const cat of categories) {
    await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log('Categories seeded successfully');
};

if (require.main === module) {
  require('dotenv').config();
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusconnect')
    .then(() => seedCategories())
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedCategories;
