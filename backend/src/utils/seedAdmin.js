const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdminOnly = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campusconnect';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const email = 'admin@dau.ac.in';
  const password = 'Password123';

  let user = await User.findOne({ email });

  if (user) {
    console.log(`User ${email} found. Updating password and ensuring Administrator role...`);
    user.password = password;
    user.role = 'Administrator';
    user.isVerified = true;
    user.status = 'Active';
    await user.save();
    console.log(`User ${email} successfully updated.`);
  } else {
    console.log(`Creating user ${email}...`);
    user = await User.create({
      email,
      password,
      role: 'Administrator',
      isVerified: true,
      status: 'Active',
      profile: {
        name: 'DAU Admin',
        program: 'Administration',
        year: 'Staff',
        contactPreferences: 'email',
      },
    });
    console.log(`User ${email} created with Administrator role!`);
  }

  console.log('\n--- Admin Credentials Ready ---');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Role:     ${user.role}`);
  console.log('-------------------------------\n');

  await mongoose.connection.close();
  process.exit(0);
};

seedAdminOnly().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
