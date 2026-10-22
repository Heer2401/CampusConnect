const test = require('node:test');
const assert = require('node:assert/strict');
const Listing = require('../models/Listing');
const { suggestListing } = require('../controllers/aiController');

test('AI Controller - suggestListing rejects request missing image file', async () => {
  const req = {
    body: { nameOrBrand: 'Casio Calculator', age: '1 year' },
    file: undefined,
  };
  let responseStatus = null;
  let responseJson = null;
  const res = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(payload) {
      responseJson = payload;
      return this;
    },
  };
  const next = (err) => {
    throw err;
  };

  await suggestListing(req, res, next);
  assert.equal(responseStatus, 400);
  assert.equal(responseJson.success, false);
  assert.equal(responseJson.error.message, 'A listing image is required');
});

test('Listing Model - accepts aiMeta and maintains schema integrity', () => {
  const sampleListing = new Listing({
    title: 'Casio FX-991EX Scientific Calculator',
    description: 'Lightly used engineering calculator in excellent condition.',
    category: '507f1f77bcf86cd799439011',
    listingType: 'sell',
    price: 450,
    condition: 'like_new',
    status: 'draft',
    owner: '507f1f77bcf86cd799439022',
    aiMeta: {
      isAiGenerated: true,
      source: 'groq',
      model: 'qwen/qwen3.8-27b',
      confidence: 0.95,
      suggestedPrice: 450,
    },
  });

  assert.equal(sampleListing.aiMeta.isAiGenerated, true);
  assert.equal(sampleListing.aiMeta.source, 'groq');
  assert.equal(sampleListing.status, 'draft');
  assert.equal(sampleListing.condition, 'like_new');
});
