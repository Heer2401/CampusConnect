const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Listing = require('../../src/models/Listing');
const Category = require('../../src/models/Category');
const User = require('../../src/models/User');
const ChatThread = require('../../src/models/ChatThread');
const Message = require('../../src/models/Message');
const Notification = require('../../src/models/Notification');
const { connectDB, closeDB } = require('../marketplace/helpers/db');
const { generateToken } = require('../marketplace/helpers/auth');

let testCat;
let buyer;
let seller;
let intruder;
let buyerToken;
let sellerToken;
let intruderToken;
let listing;

beforeAll(async () => {
  await connectDB();
  testCat = await Category.create({ name: 'Books', slug: 'books', isActive: true });
  buyer = await User.create({ name: 'Buyer Student', email: 'buyer@test.com', password: 'pw', role: 'Student' });
  seller = await User.create({ name: 'Seller Student', email: 'seller@test.com', password: 'pw', role: 'Student' });
  intruder = await User.create({ name: 'Intruder Student', email: 'intruder@test.com', password: 'pw', role: 'Student' });

  buyerToken = generateToken(buyer._id, 'Student');
  sellerToken = generateToken(seller._id, 'Student');
  intruderToken = generateToken(intruder._id, 'Student');
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await ChatThread.deleteMany({});
  await Message.deleteMany({});
  await Notification.deleteMany({});
  await Listing.deleteMany({});

  listing = await Listing.create({
    title: 'Computer Networking: A Top Down Approach',
    description: 'Kurose Ross networking book, very clean',
    category: testCat._id,
    listingType: 'sell',
    price: 550,
    condition: 'good',
    owner: seller._id,
    status: 'active'
  });
});

describe('Chat & Messaging APIs (/api/v1/chat)', () => {
  it('should start a conversation for a listing between buyer and seller', async () => {
    const res = await request(app)
      .post('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing._id })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.participants.length).toBe(2);
    expect(res.body.data.listingId._id.toString()).toBe(listing._id.toString());
  });

  it('should prevent user from starting a conversation with themselves', async () => {
    const res = await request(app)
      .post('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ listingId: listing._id, recipientId: seller._id })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return existing conversation idempotently without duplicates', async () => {
    const first = await request(app)
      .post('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing._id })
      .expect(201);

    const second = await request(app)
      .post('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing._id })
      .expect(200);

    expect(second.body.data._id.toString()).toBe(first.body.data._id.toString());
    const count = await ChatThread.countDocuments({ listingId: listing._id });
    expect(count).toBe(1);
  });

  it('should send and persist a message with sender, timestamp, and content', async () => {
    const threadRes = await request(app)
      .post('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing._id });

    const threadId = threadRes.body.data._id;

    const msgRes = await request(app)
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: 'Hi, is this networking book still available for pickup?' })
      .expect(201);

    expect(msgRes.body.success).toBe(true);
    expect(msgRes.body.data.content).toBe('Hi, is this networking book still available for pickup?');
    expect(msgRes.body.data.senderId._id.toString()).toBe(buyer._id.toString());

    // Verify conversation last message preview was updated
    const updatedThread = await ChatThread.findById(threadId);
    expect(updatedThread.lastMessagePreview).toContain('Hi, is this networking book');

    // Verify notification was created for recipient (seller)
    const notification = await Notification.findOne({ userId: seller._id, type: 'chat_message' });
    expect(notification).not.toBeNull();
    expect(notification.message).toContain('Hi, is this networking book');
  });

  it('should reject empty messages or messages exceeding character limits', async () => {
    const threadRes = await request(app)
      .post('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing._id });

    const threadId = threadRes.body.data._id;

    await request(app)
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: '   ' })
      .expect(400);

    const longMessage = 'a'.repeat(2500);
    await request(app)
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: longMessage })
      .expect(400);
  });

  it('should prevent intruder from reading or sending messages in another user conversation', async () => {
    const threadRes = await request(app)
      .post('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing._id });

    const threadId = threadRes.body.data._id;

    // Intruder attempts to read messages
    await request(app)
      .get(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .expect(403);

    // Intruder attempts to send message
    await request(app)
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ content: 'I am spying on your conversation' })
      .expect(403);
  });

  it('should retrieve conversation message history and calculate unread counts', async () => {
    const threadRes = await request(app)
      .post('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing._id });

    const threadId = threadRes.body.data._id;

    // Buyer sends message
    await request(app)
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: 'Hello!' });

    // Seller checks thread list -> unreadCount should be 1
    const sellerThreads = await request(app)
      .get('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(sellerThreads.body.data.length).toBe(1);
    expect(sellerThreads.body.data[0].unreadCount).toBe(1);

    // Seller opens message history -> automatically marks read
    const historyRes = await request(app)
      .get(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(historyRes.body.data.length).toBe(1);

    // Check thread list again -> unreadCount should now be 0
    const recheck = await request(app)
      .get('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(recheck.body.data[0].unreadCount).toBe(0);
  });
});
