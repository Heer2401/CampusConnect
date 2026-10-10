const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const Category = require('../../src/models/Category');
const seedCategories = require('../../src/utils/seedCategories');
const jwt = require('jsonwebtoken');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Category.deleteMany({});
});

const generateToken = (id, role = 'User') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'campusconnect_jwt_secret', { expiresIn: '1h' });
};

describe('Category APIs', () => {
  describe('GET /api/v1/categories', () => {
    it('should return active categories sorted by sortOrder', async () => {
      await Category.create([
        { name: 'Books', slug: 'books', sortOrder: 2 },
        { name: 'Notes', slug: 'notes', sortOrder: 1, isActive: false },
        { name: 'Other', slug: 'other', sortOrder: 3 },
      ]);
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].name).toBe('Books');
    });

    it('should seed categories idempotently', async () => {
      await seedCategories();
      const count1 = await Category.countDocuments();
      await seedCategories();
      const count2 = await Category.countDocuments();
      expect(count1).toBe(count2);
      expect(count1).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/categories', () => {
    it('should block non-admin users', async () => {
      const token = generateToken(new mongoose.Types.ObjectId(), 'User');
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', slug: 'test' });
      expect(res.status).toBe(403);
    });

    it('should block unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .send({ name: 'Test', slug: 'test' });
      expect(res.status).toBe(401);
    });

    it('should create category for admin', async () => {
      const token = generateToken(new mongoose.Types.ObjectId(), 'Administrator');
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Cat', slug: 'test-cat' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Cat');
    });
  });
});
