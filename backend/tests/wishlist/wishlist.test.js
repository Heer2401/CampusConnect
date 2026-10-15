const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Listing = require('../../src/models/Listing');
const Category = require('../../src/models/Category');
const User = require('../../src/models/User');
const WishlistItem = require('../../src/models/WishlistItem');
const { connectDB, closeDB } = require('../marketplace/helpers/db');
const { generateToken } = require('../marketplace/helpers/auth');

let testCat;
let user1;
let user2;
let token1;
let token2;
let listing1;
let listing2;

beforeAll(async () => {
  await connectDB();
  testCat = await Category.create({ name: 'Books', slug: 'books', isActive: true });
  user1 = await User.create({ name: 'Heer', email: 'heer.wishlist@test.com', password: 'pw', role: 'Student' });
  user2 = await User.create({ name: 'Bob', email: 'bob.wishlist@test.com', password: 'pw', role: 'Student' });
  token1 = generateToken(user1._id, 'Student');
  token2 = generateToken(user2._id, 'Student');
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await WishlistItem.deleteMany({});
  await Listing.deleteMany({});

  listing1 = await Listing.create({
    title: 'Operating Systems Concepts',
    description: 'Silberschatz OS dinosaur book',
    category: testCat._id,
    listingType: 'sell',
    price: 450,
    condition: 'good',
    owner: user2._id,
    status: 'active'
  });

  listing2 = await Listing.create({
    title: 'Study Table Lamp',
    description: 'Desk lamp in working condition',
    category: testCat._id,
    listingType: 'giveaway',
    price: 0,
    condition: 'fair',
    owner: user2._id,
    status: 'active'
  });
});

describe('Wishlist APIs (/api/v1/wishlist)', () => {
  it('should reject unauthenticated requests to get or add wishlist', async () => {
    await request(app)
      .get('/api/v1/wishlist')
      .expect(401);

    await request(app)
      .post('/api/v1/wishlist')
      .send({ listingId: listing1._id })
      .expect(401);
  });

  it('should add listing to user wishlist', async () => {
    const res = await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .send({ listingId: listing1._id })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.listingId.toString()).toBe(listing1._id.toString());
    expect(res.body.data.userId.toString()).toBe(user1._id.toString());
  });

  it('should prevent duplicate wishlist entries', async () => {
    // First addition
    await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .send({ listingId: listing1._id })
      .expect(201);

    // Second addition should succeed idempotently without creating duplicate
    const resDup = await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .send({ listingId: listing1._id })
      .expect(200);

    expect(resDup.body.success).toBe(true);

    const count = await WishlistItem.countDocuments({ userId: user1._id, listingId: listing1._id });
    expect(count).toBe(1);
  });

  it('should retrieve user wishlist with populated listing details', async () => {
    await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .send({ listingId: listing1._id })
      .expect(201);

    const res = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].listing.title).toBe('Operating Systems Concepts');
    expect(res.body.data[0].listing.price).toBe(450);
    expect(res.body.data[0].isUnavailable).toBe(false);
  });

  it('should ensure each user accesses only their own wishlist', async () => {
    // User 1 adds listing 1
    await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .send({ listingId: listing1._id })
      .expect(201);

    // User 2 adds listing 2
    await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token2}`)
      .send({ listingId: listing2._id })
      .expect(201);

    // User 1 should only see listing 1
    const res1 = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res1.body.data.length).toBe(1);
    expect(res1.body.data[0].listing._id.toString()).toBe(listing1._id.toString());

    // User 2 should only see listing 2
    const res2 = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);

    expect(res2.body.data.length).toBe(1);
    expect(res2.body.data[0].listing._id.toString()).toBe(listing2._id.toString());
  });

  it('should remove a listing from wishlist', async () => {
    await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .send({ listingId: listing1._id });

    const delRes = await request(app)
      .delete(`/api/v1/wishlist/${listing1._id}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(delRes.body.success).toBe(true);

    const check = await WishlistItem.findOne({ userId: user1._id, listingId: listing1._id });
    expect(check).toBeNull();
  });

  it('should return fast wishlist ids array for heart synchronization', async () => {
    await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .send({ listingId: listing1._id });

    const res = await request(app)
      .get('/api/v1/wishlist/ids')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toContain(listing1._id.toString());
  });

  it('should handle deleted or inactive listings gracefully', async () => {
    await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .send({ listingId: listing1._id });

    // Mark listing as deleted
    listing1.isDeleted = true;
    await listing1.save();

    const res = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data[0].isUnavailable).toBe(true);
  });
});
