const test = require('node:test');
const assert = require('node:assert');
const models = require('../models');

test('Schema Verification - All 19 Mongoose models are properly exported', (t) => {
  const expectedModels = [
    'User',
    'Listing',
    'Category',
    'Dispute',
    'PaymentMethod',
    'Transaction',
    'Receipt',
    'Rental',
    'RentalReminder',
    'WantedPost',
    'MatchEvent',
    'ChatThread',
    'Message',
    'Notification',
    'SavedSearch',
    'WishlistItem',
    'Review',
    'AuditLog',
    'SustainabilityStat'
  ];

  for (const modelName of expectedModels) {
    assert.ok(models[modelName], `Model ${modelName} should be exported`);
    assert.strictEqual(typeof models[modelName], 'function', `Model ${modelName} should be a Mongoose model function`);
    assert.ok(models[modelName].schema, `Model ${modelName} should have a schema defined`);
  }
});

test('Schema Instantiation - Can instantiate documents without validation error on defaults', (t) => {
  // Test instantiating each model
  const paymentMethod = new models.PaymentMethod({
    userId: '507f1f77bcf86cd799439011',
    type: 'upi',
    label: 'GPay',
  });
  assert.strictEqual(paymentMethod.type, 'upi');

  const transaction = new models.Transaction({
    listingId: '507f1f77bcf86cd799439011',
    buyerId: '507f1f77bcf86cd799439012',
    sellerId: '507f1f77bcf86cd799439013',
    amount: 100,
  });
  assert.strictEqual(transaction.status, 'pending');

  const rental = new models.Rental({
    listingId: '507f1f77bcf86cd799439011',
    renterId: '507f1f77bcf86cd799439012',
    ownerId: '507f1f77bcf86cd799439013',
    startDate: new Date(),
    dueDate: new Date(Date.now() + 86400000),
    price: 20,
  });
  assert.strictEqual(rental.status, 'requested');

  const wishlistItem = new models.WishlistItem({
    userId: '507f1f77bcf86cd799439011',
    listingId: '507f1f77bcf86cd799439012',
  });
  assert.ok(wishlistItem);
});
