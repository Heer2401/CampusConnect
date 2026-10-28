const express = require('express');
const router = express.Router();
const { requireAuth } = require('../services/integration/auth.adapter');
const {
  listWantedPosts,
  createWantedPost,
  closeWantedPost,
} = require('../controllers/wantedPostController');

router.get('/', requireAuth, listWantedPosts);
router.post('/', requireAuth, createWantedPost);
router.patch('/:id/close', requireAuth, closeWantedPost);

module.exports = router;
