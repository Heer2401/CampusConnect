const express = require('express');
const router = express.Router();

const { requireAuth } = require('../services/integration/auth.adapter');
const {
  searchListings,
  getSavedSearches,
  saveSearch,
  deleteSavedSearch
} = require('../controllers/searchController');

// Public search
router.get('/', searchListings);

// User saved searches
router.get('/saved', requireAuth, getSavedSearches);
router.post('/saved', requireAuth, saveSearch);
router.delete('/saved/:id', requireAuth, deleteSavedSearch);

module.exports = router;
