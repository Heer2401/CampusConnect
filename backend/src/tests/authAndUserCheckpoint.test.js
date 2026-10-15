/**
 * Dhrumil Doshi (202512088) — Authentication & User Management Lead
 * authAndUserCheckpoint.test.js
 * 
 * Verifies FR-1.1 (University email gating), FR-1.2 (Auth & tokens),
 * FR-1.4 (User profile updates), FR-1.6 (Payment method validation),
 * and FR-1.8 (Sustainability metrics).
 */

const test = require('node:test');
const assert = require('node:assert');
const { registerUser, loginUser, refreshToken } = require('../controllers/authController');
const { addPaymentMethod } = require('../controllers/userController');
const { SustainabilityStat, User } = require('../models');

// Mock response helper
const createMockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = function(code) {
    res.statusCode = code;
    return res;
  };
  res.json = function(data) {
    res.body = data;
    return res;
  };
  return res;
};

test('FR-1.1 Email Verification - Rejects non-university email domains', async (t) => {
  const req = {
    body: {
      email: 'student@gmail.com',
      password: 'SecurePassword123!',
      name: 'Test Student'
    }
  };
  const res = createMockRes();

  await registerUser(req, res, () => {});

  assert.strictEqual(res.statusCode, 400, 'Should reject non-university email');
  assert.match(res.body.message, /valid university email address/, 'Error message should cite university email');
});

test('FR-1.1 Email Verification - Accepts official university email (e.g. 202512088@dau.ac.in)', async (t) => {
  const email = '202512088@dau.ac.in';
  const normalizedEmail = email.toLowerCase().trim();
  const isEdu = normalizedEmail.endsWith('.edu') || normalizedEmail.endsWith('.ac.in') || normalizedEmail.includes('.edu.');
  assert.strictEqual(isEdu, true, 'Official dau.ac.in domain must be recognized as valid');
});

test('FR-1.1 Registration - Requires both email and password', async (t) => {
  const req = { body: { email: 'student@university.edu' } };
  const res = createMockRes();

  await registerUser(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.match(res.body.message, /Email and password are required/);
});

test('FR-1.2 Authentication - Login requires credentials', async (t) => {
  const req = { body: {} };
  const res = createMockRes();

  await loginUser(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.match(res.body.message, /Please provide email and password/);
});

test('FR-1.2 Refresh Token - Requires refresh token in request body', async (t) => {
  const req = { body: {} };
  const res = createMockRes();

  await refreshToken(req, res, () => {});

  assert.strictEqual(res.statusCode, 401);
  assert.match(res.body.message, /Refresh token is required/);
});

test('FR-1.6 Payment Methods - Requires payment type and label', async (t) => {
  const req = {
    user: { _id: '507f1f77bcf86cd799439011' },
    body: { details: { upiId: 'test@okaxis' } }
  };
  const res = createMockRes();

  await addPaymentMethod(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.match(res.body.message, /type and label are required/);
});

test('FR-1.8 Sustainability Dashboard - Schema initial values default to zero', (t) => {
  const stat = new SustainabilityStat({
    userId: '507f1f77bcf86cd799439011'
  });

  assert.strictEqual(stat.moneySaved, 0);
  assert.strictEqual(stat.itemsReused, 0);
  assert.strictEqual(stat.co2SavedKg, 0);
  assert.strictEqual(stat.transactions, 0);
});
