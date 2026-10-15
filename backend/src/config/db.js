const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campusconnect';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error(`👉 Please ensure local MongoDB is running, or paste your MongoDB Atlas URI in backend/.env: MONGO_URI=mongodb+srv://...`);
  }
};

module.exports = connectDB;
