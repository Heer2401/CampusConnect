const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Listing = require('../../src/models/Listing');
const Category = require('../../src/models/Category');
const User = require('../../src/models/User');
const { connectDB, closeDB } = require('./helpers/db');
const { generateToken } = require('./helpers/auth');

let testCat;
let owner;
let otherUser;
let ownerToken;
let otherToken;
let listing;

// Valid 1x1 PNG buffer
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

beforeAll(async () => {
  await connectDB();
  testCat = await Category.create({ name: 'Electronics', slug: 'electronics' });
  owner = await User.create({ name: 'Owner', email: 'owner@campus.edu', password: 'pw', role: 'Student' });
  otherUser = await User.create({ name: 'Other', email: 'other@campus.edu', password: 'pw', role: 'Student' });

  ownerToken = generateToken(owner._id, 'Student');
  otherToken = generateToken(otherUser._id, 'Student');
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await Listing.deleteMany({});
  listing = await Listing.create({
    title: 'Monitor 24 inch',
    description: 'Good monitor for coding and studying',
    category: testCat._id,
    listingType: 'sell',
    price: 3000,
    owner: owner._id,
    status: 'active',
    images: []
  });
});

describe('Image Upload & Management APIs', () => {
  describe('POST /api/v1/listings/:id/images', () => {
    it('should upload valid image successfully and set primary', async () => {
      const res = await request(app)
        .post(`/api/v1/listings/${listing._id}/images`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('images', validPngBuffer, 'photo1.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isPrimary).toBe(true);
      expect(res.body.data[0].url).toMatch(/^\/uploads\/listings\//);
    });

    it('should reject non-owner upload with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/listings/${listing._id}/images`)
        .set('Authorization', `Bearer ${otherToken}`)
        .attach('images', validPngBuffer, 'photo1.png');

      expect(res.status).toBe(403);
    });

    it('should reject invalid magic bytes with 415', async () => {
      const fakePng = Buffer.from('not-a-real-png-file');
      const res = await request(app)
        .post(`/api/v1/listings/${listing._id}/images`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('images', fakePng, 'fake.png');

      expect(res.status).toBe(415);
      expect(res.body.error.message).toMatch(/Invalid file signature/);
    });

    it('should reject more than 6 images total', async () => {
      // Pre-fill listing with 5 images
      for (let i = 0; i < 5; i++) {
        listing.images.push({
          url: `/uploads/test${i}.webp`,
          thumbnailUrl: `/uploads/test${i}-thumb.webp`,
          key: `key-${i}`,
          isPrimary: i === 0,
          order: i
        });
      }
      await listing.save();

      // Try uploading 2 images (5 + 2 = 7 > 6)
      const res = await request(app)
        .post(`/api/v1/listings/${listing._id}/images`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('images', validPngBuffer, 'p1.png')
        .attach('images', validPngBuffer, 'p2.png');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Maximum 6 images/);
    });
  });

  describe('DELETE /api/v1/listings/:id/images/:imageId', () => {
    it('should delete image and promote next image as primary if primary was removed', async () => {
      listing.images = [
        { url: '/img1.webp', key: 'k1', isPrimary: true, order: 0 },
        { url: '/img2.webp', key: 'k2', isPrimary: false, order: 1 }
      ];
      await listing.save();

      const imageIdToRemove = listing.images[0]._id;

      const res = await request(app)
        .delete(`/api/v1/listings/${listing._id}/images/${imageIdToRemove}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isPrimary).toBe(true);
      expect(res.body.data[0].key).toBe('k2');
    });
  });

  describe('PATCH /api/v1/listings/:id/images/order', () => {
    it('should reorder images and update primary image', async () => {
      listing.images = [
        { url: '/img1.webp', key: 'k1', isPrimary: true, order: 0 },
        { url: '/img2.webp', key: 'k2', isPrimary: false, order: 1 }
      ];
      await listing.save();

      const id1 = listing.images[0]._id.toString();
      const id2 = listing.images[1]._id.toString();

      const res = await request(app)
        .patch(`/api/v1/listings/${listing._id}/images/order`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          order: [id2, id1],
          primaryImageId: id2
        });

      expect(res.status).toBe(200);
      expect(res.body.data[0]._id.toString()).toBe(id2);
      expect(res.body.data[0].isPrimary).toBe(true);
    });
  });
});
