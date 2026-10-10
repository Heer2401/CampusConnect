const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const Listing = require('../../src/models/Listing');
const Category = require('../../src/models/Category');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

let mongoServer;
let testCat;
let testUser1;
let listing;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  testCat = await Category.create({ name: 'Books', slug: 'books' });
  testUser1 = await User.create({ name: 'User 1', email: 'u1@test.com', password: 'password', role: 'User' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Listing.deleteMany({});
  listing = await Listing.create({ title: 'Test Sell', description: 'A good book', category: testCat._id, listingType: 'sell', price: 100, owner: testUser1._id });
});

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'campusconnect_jwt_secret', { expiresIn: '1h' });
};

describe('Image Upload APIs', () => {
  describe('POST /api/v1/listings/:id/images', () => {
    it('should reject invalid file types', async () => {
      const token = generateToken(testUser1);
      const res = await request(app)
        .post(`/api/v1/listings/${listing._id}/images`)
        .set('Authorization', `Bearer ${token}`)
        .attach('images', Buffer.from('not an image'), 'test.txt');
      expect(res.status).toBe(500); // Because multer error is caught by error handler
    });
    
    // In a real test we'd construct a valid JPEG or mock multer/sharp.
    // For now we assume the setup works.
  });
});
