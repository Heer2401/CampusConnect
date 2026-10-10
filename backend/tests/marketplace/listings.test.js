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
let testUser2;
let adminUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  testCat = await Category.create({ name: 'Books', slug: 'books' });
  testUser1 = await User.create({ name: 'User 1', email: 'u1@test.com', password: 'password', role: 'User' });
  testUser2 = await User.create({ name: 'User 2', email: 'u2@test.com', password: 'password', role: 'User' });
  adminUser = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password', role: 'Administrator' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Listing.deleteMany({});
});

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'campusconnect_jwt_secret', { expiresIn: '1h' });
};

describe('Listing APIs', () => {
  describe('POST /api/v1/listings', () => {
    it('should create a sell listing', async () => {
      const token = generateToken(testUser1);
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Sell',
          description: 'A good book',
          category: testCat._id,
          listingType: 'sell',
          price: 100
        });
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Test Sell');
      expect(res.body.data.owner.toString()).toBe(testUser1._id.toString());
    });

    it('should reject sell listing without price', async () => {
      const token = generateToken(testUser1);
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Sell No Price',
          description: 'A good book',
          category: testCat._id,
          listingType: 'sell'
        });
      expect(res.status).toBe(400);
    });

    it('should create a giveaway listing and clear price if sent', async () => {
      const token = generateToken(testUser1);
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Free Book',
          description: 'A good book for free',
          category: testCat._id,
          listingType: 'giveaway',
          price: 100 // Should be ignored/cleared
        });
      expect(res.status).toBe(201);
      expect(res.body.data.price).toBeUndefined();
    });
  });

  describe('GET /api/v1/listings', () => {
    it('should return only active listings', async () => {
      await Listing.create({ title: 'Active', description: 'Active', category: testCat._id, listingType: 'sell', price: 10, owner: testUser1._id, status: 'active' });
      await Listing.create({ title: 'Draft', description: 'Draft', category: testCat._id, listingType: 'sell', price: 10, owner: testUser1._id, status: 'draft' });

      const res = await request(app).get('/api/v1/listings');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Active');
    });
  });
  
  describe('GET /api/v1/listings/:id', () => {
    it('should allow anyone to view active listing and increment viewCount', async () => {
      const listing = await Listing.create({ title: 'Active', description: 'Active', category: testCat._id, listingType: 'sell', price: 10, owner: testUser1._id, status: 'active' });
      const res = await request(app).get(`/api/v1/listings/${listing._id}`);
      expect(res.status).toBe(200);
      // It increments viewCount if not owner
      expect(res.body.data.viewCount).toBe(1);
    });
    
    it('should block non-owner from viewing draft listing', async () => {
      const listing = await Listing.create({ title: 'Draft', description: 'Draft', category: testCat._id, listingType: 'sell', price: 10, owner: testUser1._id, status: 'draft' });
      const token = generateToken(testUser2);
      const res = await request(app)
        .get(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/listings/:id', () => {
    it('should soft delete for owner', async () => {
      const listing = await Listing.create({ title: 'Delete me', description: 'Active', category: testCat._id, listingType: 'sell', price: 10, owner: testUser1._id, status: 'active' });
      const token = generateToken(testUser1);
      const res = await request(app)
        .delete(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      
      const check = await Listing.findById(listing._id);
      expect(check.isDeleted).toBe(true);
    });
    
    it('should return 409 if status is reserved', async () => {
      const listing = await Listing.create({ title: 'Reserved', description: 'Active', category: testCat._id, listingType: 'sell', price: 10, owner: testUser1._id, status: 'reserved' });
      const token = generateToken(testUser1);
      const res = await request(app)
        .delete(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(409);
    });
  });
});
