const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Listing = require('../../src/models/Listing');
const Category = require('../../src/models/Category');
const User = require('../../src/models/User');
const SavedSearch = require('../../src/models/SavedSearch');
const { connectDB, closeDB } = require('../marketplace/helpers/db');
const { generateToken } = require('../marketplace/helpers/auth');

let testCat;
let anotherCat;
let user1;
let token1;

beforeAll(async () => {
  await connectDB();
  testCat = await Category.create({ name: 'Books', slug: 'books', isActive: true });
  anotherCat = await Category.create({ name: 'Electronics', slug: 'electronics', isActive: true });
  user1 = await User.create({ name: 'Heer', email: 'heer@test.com', password: 'pw', role: 'Student' });
  token1 = generateToken(user1._id, 'Student');
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await Listing.deleteMany({});
  await SavedSearch.deleteMany({});

  // Seed sample listings
  await Listing.create([
    {
      title: 'Calculus Early Transcendentals',
      description: 'Used for MTH101, mint condition',
      category: testCat._id,
      listingType: 'sell',
      price: 350,
      condition: 'like_new',
      tags: ['math', 'calculus'],
      owner: user1._id,
      status: 'active'
    },
    {
      title: 'Digital Signal Processing',
      description: 'Reference book for electronics courses',
      category: testCat._id,
      listingType: 'sell',
      price: 500,
      condition: 'good',
      tags: ['dsp', 'signals'],
      owner: user1._id,
      status: 'active'
    },
    {
      title: 'TI-84 Plus CE Graphing Calculator',
      description: 'Scientific calculator for rental',
      category: anotherCat._id,
      listingType: 'rent',
      rentalRate: 50,
      rentalPeriod: 'week',
      condition: 'new',
      tags: ['calculator', 'math'],
      owner: user1._id,
      status: 'active'
    },
    {
      title: 'Free Study Desk Lamp',
      description: 'Working LED desk lamp for hostel room',
      category: anotherCat._id,
      listingType: 'giveaway',
      price: 0,
      condition: 'fair',
      tags: ['lamp', 'hostel'],
      owner: user1._id,
      status: 'active'
    },
    {
      title: 'Draft Laptop Stand',
      description: 'Unpublished draft listing',
      category: anotherCat._id,
      listingType: 'sell',
      price: 150,
      condition: 'good',
      owner: user1._id,
      status: 'draft'
    }
  ]);
});

describe('Search & Filter APIs (/api/v1/search)', () => {
  it('should search listings by keyword matching title or tags', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=calculus')
      .expect(200);

    expect(res.body.success).toBe(true);
    // Should match both "Calculus Early Transcendentals" and the TI-84 with "calculus" tag or "Calculator"
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some(item => item.title.includes('Calculus'))).toBe(true);
  });

  it('should filter listings by category slug', async () => {
    const res = await request(app)
      .get('/api/v1/search?category=books')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.every(item => item.category.slug === 'books')).toBe(true);
  });

  it('should filter listings by listingType', async () => {
    const res = await request(app)
      .get('/api/v1/search?listingType=rent')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('TI-84 Plus CE Graphing Calculator');
  });

  it('should filter by minPrice and maxPrice', async () => {
    const res = await request(app)
      .get('/api/v1/search?minPrice=300&maxPrice=400')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Calculus Early Transcendentals');
  });

  it('should sort listings by price_asc and price_desc', async () => {
    const resAsc = await request(app)
      .get('/api/v1/search?listingType=sell&sort=price_asc')
      .expect(200);

    expect(resAsc.body.success).toBe(true);
    const prices = resAsc.body.data.map(i => i.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }

    const resDesc = await request(app)
      .get('/api/v1/search?listingType=sell&sort=price_desc')
      .expect(200);

    expect(resDesc.body.success).toBe(true);
    const pricesDesc = resDesc.body.data.map(i => i.price);
    for (let i = 1; i < pricesDesc.length; i++) {
      expect(pricesDesc[i]).toBeLessThanOrEqual(pricesDesc[i - 1]);
    }
  });

  it('should only return active listings by default and exclude draft/deleted', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.every(item => item.status === 'active')).toBe(true);
    expect(res.body.data.some(item => item.title === 'Draft Laptop Stand')).toBe(false);
  });

  it('should handle pagination properly', async () => {
    const res = await request(app)
      .get('/api/v1/search?limit=2&page=1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(2);
    expect(res.body.meta.total).toBe(4);
    expect(res.body.meta.totalPages).toBe(2);
  });

  it('should return empty results gracefully for non-matching queries', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=xyznonexistentquery999')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.meta.total).toBe(0);
  });
});

describe('Saved Search APIs (/api/v1/search/saved)', () => {
  it('should save a search query for authenticated user', async () => {
    const res = await request(app)
      .post('/api/v1/search/saved')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        name: 'Math Books Under 400',
        filters: { q: 'calculus', maxPrice: 400, category: 'books' }
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Math Books Under 400');
    expect(res.body.data.userId.toString()).toBe(user1._id.toString());
  });

  it('should list saved searches for user', async () => {
    await SavedSearch.create({
      userId: user1._id,
      name: 'Electronics Rental Alert',
      filters: { listingType: 'rent' }
    });

    const res = await request(app)
      .get('/api/v1/search/saved')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Electronics Rental Alert');
  });

  it('should delete a saved search for user', async () => {
    const saved = await SavedSearch.create({
      userId: user1._id,
      name: 'To Delete',
      filters: {}
    });

    await request(app)
      .delete(`/api/v1/search/saved/${saved._id}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    const check = await SavedSearch.findById(saved._id);
    expect(check).toBeNull();
  });
});
