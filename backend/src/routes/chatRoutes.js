const express = require('express');
const router = express.Router();

const { requireAuth } = require('../services/integration/auth.adapter');
const {
  getThreads,
  createOrGetThread,
  getThreadById,
  getMessages,
  sendMessage,
  markThreadRead
} = require('../controllers/chatController');

// All chat routes are protected by server-side authentication
router.get('/threads', requireAuth, getThreads);
router.post('/threads', requireAuth, createOrGetThread);
router.get('/threads/:id', requireAuth, getThreadById);
router.get('/threads/:id/messages', requireAuth, getMessages);
router.post('/threads/:id/messages', requireAuth, sendMessage);
router.patch('/threads/:id/read', requireAuth, markThreadRead);

module.exports = router;
