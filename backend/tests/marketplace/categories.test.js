const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Category = require('../../src/models/Category');
const Listing = require('../../src/models/Listing');
const User = require('../../src/models/User');
const seedCategories = require('../../src/utils/seedCategories');
const { connectDB, clearDB, closeDB } = require('./helpers/db');
const { generateToken } = require('./helpers/auth');

let adminUser;
let regularUser;
let adminToken;
let userToken;

beforeAll(async () => {
  await connectDB();
  adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@campus.edu',
    password: 'password123',
    role: 'Administrator'
  });
  regularUser = await User.create({
    name: 'Student User',
    email: 'student@campus.edu',
    password: 'password123',
    role: 'Student'
  });
  adminToken = generateToken(adminUser._id, 'Administrator');
  userToken = generateToken(regularUser._id, 'Student');
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await Category.deleteMany({});
  await Listing.deleteMany({});
});

describe('Category APIs', () => {
  describe('GET /api/v1/categories', () => {
    it('should list active categories with listingCount sorted by sortOrder', async () => {
      const cat1 = await Category.create({ name: 'Books', slug: 'books', sortOrder: 1, isActive: true });
      const cat2 = await Category.create({ name: 'Gadgets', slug: 'gadgets', sortOrder: 2, isActive: true });
      await Category.create({ name: 'Inactive Cat', slug: 'inactive', sortOrder: 3, isActive: false });

      // Create an active listing in cat1
      await Listing.create({
        title: 'Algorithms Book',
        description: 'Hardcover 4th edition',
        category: cat1._id,
        listingType: 'sell',
        price: 500,
        owner: regularUser._id,
        status: 'active'
      });

      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].slug).toBe('books');
      expect(res.body.data[0].listingCount).toBe(1);
      expect(res.body.data[1].slug).toBe('gadgets');
      expect(res.body.data[1].listingCount).toBe(0);
    });

    it('should return tree structure when tree=true', async () => {
      const parent = await Category.create({ name: 'Parent Books', slug: 'parent-books', sortOrder: 1 });
      await Category.create({ name: 'Child Fiction', slug: 'child-fiction', parent: parent._id, sortOrder: 2 });

      const res = await request(app).get('/api/v1/categories?tree=true');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].children.length).toBe(1);
      expect(res.body.data[0].children[0].slug).toBe('child-fiction');
    });

    it('should seed categories idempotently', async () => {
      await seedCategories();
      const count1 = await Category.countDocuments();
      await seedCategories();
      const count2 = await Category.countDocuments();
      expect(count1).toBe(count2);
      expect(count1).toBe(14);
    });
  });

  describe('GET /api/v1/categories/:idOrSlug', () => {
    it('should get category by slug or id', async () => {
      const cat = await Category.create({ name: 'Stationery', slug: 'stationery' });
      const resSlug = await request(app).get('/api/v1/categories/stationery');
      expect(resSlug.status).toBe(200);
      expect(resSlug.body.data.name).toBe('Stationery');

      const resId = await request(app).get(`/api/v1/categories/${cat._id}`);
      expect(resId.status).toBe(200);
      expect(resId.body.data.name).toBe('Stationery');
    });

    it('should return 404 for unknown category', async () => {
      const res = await request(app).get('/api/v1/categories/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/categories (Admin Only)', () => {
    it('should return 401 if unauthenticated', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .send({ name: 'New Cat', slug: 'new-cat' });
      expect(res.status).toBe(401);
    });

    it('should return 403 if non-admin', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'New Cat', slug: 'new-cat' });
      expect(res.status).toBe(403);
    });

    it('should create category for admin', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Lab Coats', slug: 'lab-coats', description: 'White coats' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Lab Coats');
    });

    it('should return 409 on duplicate slug or name', async () => {
      await Category.create({ name: 'Cycles', slug: 'cycles' });
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cycles', slug: 'cycles' });
      expect(res.status).toBe(409);
    });
  });

  describe('PATCH /api/v1/categories/:id', () => {
    it('should update category for admin', async () => {
      const cat = await Category.create({ name: 'Old Name', slug: 'old-name' });
      const res = await request(app)
        .patch(`/api/v1/categories/${cat._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('should delete unreferenced category for admin', async () => {
      const cat = await Category.create({ name: 'Temp Cat', slug: 'temp-cat' });
      const res = await request(app)
        .delete(`/api/v1/categories/${cat._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('should return 409 if category is in use by listings', async () => {
      const cat = await Category.create({ name: 'Used Cat', slug: 'used-cat' });
      await Listing.create({
        title: 'Listing in used cat',
        description: 'Testing delete reference block',
        category: cat._id,
        listingType: 'sell',
        price: 200,
        owner: regularUser._id,
        status: 'active'
      });

      const res = await request(app)
        .delete(`/api/v1/categories/${cat._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/in use/);
    });
  });
});
