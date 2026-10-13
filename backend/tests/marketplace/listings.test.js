const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Listing = require('../../src/models/Listing');
const Category = require('../../src/models/Category');
const User = require('../../src/models/User');
const { connectDB, closeDB } = require('./helpers/db');
const { generateToken } = require('./helpers/auth');

let testCat;
let user1;
let user2;
let adminUser;
let token1;
let token2;
let adminToken;

beforeAll(async () => {
  await connectDB();
  testCat = await Category.create({ name: 'Textbooks', slug: 'textbooks', isActive: true });
  user1 = await User.create({ name: 'Alice', email: 'alice@test.com', password: 'pw', role: 'Student' });
  user2 = await User.create({ name: 'Bob', email: 'bob@test.com', password: 'pw', role: 'Student' });
  adminUser = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'pw', role: 'Administrator' });

  token1 = generateToken(user1._id, 'Student');
  token2 = generateToken(user2._id, 'Student');
  adminToken = generateToken(adminUser._id, 'Administrator');
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await Listing.deleteMany({});
});

describe('Listing CRUD APIs', () => {
  describe('POST /api/v1/listings (Creation & Validation)', () => {
    it('should create valid sell listing and ignore spoofed owner in body', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Physics Book',
          description: 'University Physics with Modern Physics 14th edition',
          category: testCat._id,
          listingType: 'sell',
          price: 450,
          condition: 'good',
          owner: user2._id // Should be overridden by token1's user1._id
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Physics Book');
      expect(res.body.data.owner.toString()).toBe(user1._id.toString());
      expect(res.body.data.price).toBe(450);
    });

    it('should create valid rent listing', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Casio Calculator',
          description: 'fx-991ES Plus calculator available for rent',
          category: testCat._id,
          listingType: 'rent',
          rentalRate: 30,
          rentalPeriod: 'week',
          deposit: 200,
          condition: 'like_new'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.rentalRate).toBe(30);
      expect(res.body.data.rentalPeriod).toBe('week');
      expect(res.body.data.deposit).toBe(200);
    });

    it('should create valid exchange listing', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Data Structures Book',
          description: 'Good condition book for trade',
          category: testCat._id,
          listingType: 'exchange',
          exchangeFor: 'Looking for Algorithms textbook or Python book',
          condition: 'good'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.exchangeFor).toBe('Looking for Algorithms textbook or Python book');
    });

    it('should create valid giveaway listing', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Old Assignment Notebooks',
          description: 'Blank pages remaining, free to whoever needs them',
          category: testCat._id,
          listingType: 'giveaway',
          condition: 'fair'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.listingType).toBe('giveaway');
    });

    it('should reject sell listing missing price or price <= 0', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Chemistry Book',
          description: 'Organic chemistry notes and guide',
          category: testCat._id,
          listingType: 'sell',
          price: 0
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Price is required/);
    });

    it('should reject rent listing missing rentalRate or rentalPeriod', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Drafter Tool',
          description: 'Engineering drawing tool',
          category: testCat._id,
          listingType: 'rent',
          rentalRate: 20
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Rental period is required/);
    });

    it('should reject exchange listing missing exchangeFor', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Math Notes',
          description: 'Math notes for trade',
          category: testCat._id,
          listingType: 'exchange'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/exchangeFor is required/);
    });

    it('should reject giveaway listing if price > 0', async () => {
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Free Lamp',
          description: 'Study lamp in working condition',
          category: testCat._id,
          listingType: 'giveaway',
          price: 50
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Price must be 0 or absent/);
    });
  });

  describe('GET /api/v1/listings (Public Browsing & Filtering)', () => {
    beforeEach(async () => {
      await Listing.create([
        {
          title: 'Active Book A',
          description: 'Math textbook for engineering',
          category: testCat._id,
          listingType: 'sell',
          price: 300,
          condition: 'good',
          owner: user1._id,
          status: 'active'
        },
        {
          title: 'Active Book B',
          description: 'Calculus textbook for science',
          category: testCat._id,
          listingType: 'sell',
          price: 150,
          condition: 'fair',
          owner: user1._id,
          status: 'active'
        },
        {
          title: 'Draft Book C',
          description: 'Not published yet',
          category: testCat._id,
          listingType: 'sell',
          price: 500,
          owner: user1._id,
          status: 'draft'
        }
      ]);
    });

    it('should only return active listings for public browse', async () => {
      const res = await request(app).get('/api/v1/listings');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('should filter by minPrice/maxPrice and sort by price_asc', async () => {
      const res = await request(app).get('/api/v1/listings?minPrice=200&sort=price_asc');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Active Book A');
    });

    it('should filter by search query q', async () => {
      const res = await request(app).get('/api/v1/listings?q=Calculus');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Active Book B');
    });
  });

  describe('GET /api/v1/listings/mine', () => {
    it('should return all owner listings across all statuses', async () => {
      await Listing.create([
        { title: 'User1 Active', description: 'Desc active', category: testCat._id, listingType: 'sell', price: 10, owner: user1._id, status: 'active' },
        { title: 'User1 Draft', description: 'Desc draft', category: testCat._id, listingType: 'sell', price: 20, owner: user1._id, status: 'draft' },
        { title: 'User2 Item', description: 'Desc user2', category: testCat._id, listingType: 'sell', price: 30, owner: user2._id, status: 'active' }
      ]);

      const res = await request(app)
        .get('/api/v1/listings/mine')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });
  });

  describe('GET /api/v1/listings/:id', () => {
    it('should return 400 for invalid ID', async () => {
      const res = await request(app).get('/api/v1/listings/invalid-id');
      expect(res.status).toBe(400);
    });

    it('should return 404 for nonexistent ID', async () => {
      const nonExistent = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/listings/${nonExistent}`);
      expect(res.status).toBe(404);
    });

    it('should view active listing and increment viewCount for non-owner', async () => {
      const listing = await Listing.create({
        title: 'Popular Book',
        description: 'High demand book',
        category: testCat._id,
        listingType: 'sell',
        price: 250,
        owner: user1._id,
        status: 'active',
        viewCount: 0
      });

      const res = await request(app)
        .get(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body.data.viewCount).toBe(1);
    });

    it('should forbid non-owner non-admin from viewing draft listing', async () => {
      const listing = await Listing.create({
        title: 'Secret Draft',
        description: 'Draft not ready',
        category: testCat._id,
        listingType: 'sell',
        price: 250,
        owner: user1._id,
        status: 'draft'
      });

      const res = await request(app)
        .get(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/listings/:id', () => {
    it('should update listing fields for owner', async () => {
      const listing = await Listing.create({
        title: 'Original Title',
        description: 'Original description text here',
        category: testCat._id,
        listingType: 'sell',
        price: 100,
        owner: user1._id,
        status: 'active'
      });

      const res = await request(app)
        .patch(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should block non-owner from updating listing', async () => {
      const listing = await Listing.create({
        title: 'User1 Book',
        description: 'Original description text',
        category: testCat._id,
        listingType: 'sell',
        price: 100,
        owner: user1._id,
        status: 'active'
      });

      const res = await request(app)
        .patch(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });

    it('should clear old type fields when switching listingType', async () => {
      const listing = await Listing.create({
        title: 'Book for Sale',
        description: 'Was for sale, now for exchange',
        category: testCat._id,
        listingType: 'sell',
        price: 350,
        owner: user1._id,
        status: 'active'
      });

      const res = await request(app)
        .patch(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          listingType: 'exchange',
          exchangeFor: 'Trade with another book'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.listingType).toBe('exchange');
      expect(res.body.data.price).toBeUndefined();
      expect(res.body.data.exchangeFor).toBe('Trade with another book');
    });
  });

  describe('DELETE /api/v1/listings/:id', () => {
    it('should soft delete listing and mark isDeleted=true', async () => {
      const listing = await Listing.create({
        title: 'To Delete',
        description: 'About to be soft deleted',
        category: testCat._id,
        listingType: 'sell',
        price: 100,
        owner: user1._id,
        status: 'active'
      });

      const res = await request(app)
        .delete(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);

      const check = await Listing.findById(listing._id);
      expect(check.isDeleted).toBe(true);
      expect(check.deletedAt).toBeDefined();

      // Deleted should not appear in public browse
      const browse = await request(app).get('/api/v1/listings');
      expect(browse.body.data.length).toBe(0);
    });

    it('should return 409 if listing status is reserved or rented', async () => {
      const reservedListing = await Listing.create({
        title: 'Reserved Book',
        description: 'Currently reserved in a transaction',
        category: testCat._id,
        listingType: 'sell',
        price: 100,
        owner: user1._id,
        status: 'reserved'
      });

      const res = await request(app)
        .delete(`/api/v1/listings/${reservedListing._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/active transaction/);
    });
  });
});
