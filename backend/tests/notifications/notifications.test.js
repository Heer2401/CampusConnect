const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Notification = require('../../src/models/Notification');
const { connectDB, closeDB } = require('../marketplace/helpers/db');
const { generateToken } = require('../marketplace/helpers/auth');

let user1;
let user2;
let token1;
let token2;

beforeAll(async () => {
  await connectDB();
  user1 = await User.create({ name: 'User One', email: 'user1.notif@test.com', password: 'pw', role: 'Student' });
  user2 = await User.create({ name: 'User Two', email: 'user2.notif@test.com', password: 'pw', role: 'Student' });

  token1 = generateToken(user1._id, 'Student');
  token2 = generateToken(user2._id, 'Student');
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await Notification.deleteMany({});

  // Seed sample notifications for user1
  await Notification.create([
    {
      userId: user1._id,
      type: 'chat_message',
      title: 'New message from Alice',
      message: 'Is the textbook still available?',
      isRead: false
    },
    {
      userId: user1._id,
      type: 'rental_reminder',
      title: 'Rental Due Soon',
      message: 'Your calculator rental is due tomorrow.',
      isRead: false
    },
    {
      userId: user1._id,
      type: 'listing_approved',
      title: 'Listing Approved',
      message: 'Your desk lamp has been approved by admin.',
      isRead: true,
      readAt: new Date()
    },
    // Seed notification for user2
    {
      userId: user2._id,
      type: 'system',
      title: 'Welcome to CampusConnect',
      message: 'Verify your email to get started.',
      isRead: false
    }
  ]);
});

describe('Notification APIs (/api/v1/notifications)', () => {
  it('should reject unauthenticated requests to get notifications', async () => {
    await request(app)
      .get('/api/v1/notifications')
      .expect(401);
  });

  it('should retrieve notifications only belonging to authenticated user with unread count', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.unreadCount).toBe(2);
    // Should not contain user2's notification
    expect(res.body.data.some(n => n.title === 'Welcome to CampusConnect')).toBe(false);
  });

  it('should mark a single notification as read', async () => {
    const unread = await Notification.findOne({ userId: user1._id, isRead: false });

    const res = await request(app)
      .patch(`/api/v1/notifications/${unread._id}/read`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isRead).toBe(true);
    expect(res.body.data.readAt).not.toBeNull();

    const updated = await Notification.findById(unread._id);
    expect(updated.isRead).toBe(true);
  });

  it('should prevent marking another user notification as read', async () => {
    const user2Notif = await Notification.findOne({ userId: user2._id });

    await request(app)
      .patch(`/api/v1/notifications/${user2Notif._id}/read`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(404);
  });

  it('should mark all notifications as read for current user', async () => {
    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    const remainingUnread = await Notification.countDocuments({ userId: user1._id, isRead: false });
    expect(remainingUnread).toBe(0);

    // User 2's notifications should remain untouched
    const user2Unread = await Notification.countDocuments({ userId: user2._id, isRead: false });
    expect(user2Unread).toBe(1);
  });

  it('should delete a notification for user', async () => {
    const notif = await Notification.findOne({ userId: user1._id });

    await request(app)
      .delete(`/api/v1/notifications/${notif._id}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    const check = await Notification.findById(notif._id);
    expect(check).toBeNull();
  });
});
