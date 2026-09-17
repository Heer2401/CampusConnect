const test = require('node:test');
const assert = require('node:assert');
const { adminOnly } = require('../middlewares/adminMiddleware');
const { protect } = require('../middlewares/authMiddleware');
const {
  rejectListing,
  updateUserStatus,
  createCategory,
  resolveDispute
} = require('../controllers/adminController');

// Mock helpers
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

test('RBAC Middleware - adminOnly restricts non-administrators', (t) => {
  const req = { user: { email: 'student@university.edu', role: 'Student' } };
  const res = createMockRes();
  let nextCalled = false;

  adminOnly(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, false, 'Next should not be called for non-admin');
  assert.strictEqual(res.statusCode, 403, 'Should return 403 Forbidden');
  assert.match(res.body.message, /Administrator permissions required/);
});

test('RBAC Middleware - adminOnly permits Administrator role', (t) => {
  const req = { user: { email: 'admin@university.edu', role: 'Administrator' } };
  const res = createMockRes();
  let nextCalled = false;

  adminOnly(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true, 'Next should be called for admin');
  assert.strictEqual(res.statusCode, 200);
});

test('Auth Middleware - protect rejects requests with missing token', async (t) => {
  const req = { headers: {} };
  const res = createMockRes();
  let nextCalled = false;

  await protect(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 401);
  assert.match(res.body.message, /no token provided/);
});

test('Listing Moderation API - rejectListing requires rejection reason', async (t) => {
  const req = { params: { id: 'mock-id' }, body: {} };
  const res = createMockRes();
  let nextError = null;

  await rejectListing(req, res, (err) => { nextError = err; });

  assert.strictEqual(res.statusCode, 400);
  assert.match(res.body.message, /Rejection reason is required/);
});

test('Category Management API - createCategory requires category name', async (t) => {
  const req = { body: {} };
  const res = createMockRes();

  await createCategory(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.match(res.body.message, /Category name is required/);
});

test('Dispute Handling API - resolveDispute validates resolution status', async (t) => {
  const req = { params: { id: 'mock-id' }, body: { status: 'invalid_status' } };
  const res = createMockRes();

  await resolveDispute(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.match(res.body.message, /Valid resolution status/);
});
