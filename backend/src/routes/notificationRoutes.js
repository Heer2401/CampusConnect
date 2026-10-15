const express = require('express');
const router = express.Router();

const { requireAuth } = require('../services/integration/auth.adapter');
const {
  getNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification
} = require('../controllers/notificationController');

// All notification operations require authentication and user-scoping
router.get('/', requireAuth, getNotifications);
router.patch('/read-all', requireAuth, markAllRead);
router.patch('/:id/read', requireAuth, markNotificationRead);
router.delete('/:id', requireAuth, deleteNotification);

module.exports = router;
