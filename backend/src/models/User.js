const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+@.+\..+/, 'Please use a valid university email address'],
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Student', 'Administrator'],
    default: 'Student',
  },
  profile: {
    name: String,
    program: String,
    year: String,
    contactPreferences: String,
  },
  reputation: {
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  suspensionReason: {
    type: String,
    default: null,
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
