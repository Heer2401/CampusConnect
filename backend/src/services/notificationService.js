const Notification = require('../models/Notification');

/**
 * Service to dispatch notifications, persist in MongoDB,
 * and push real-time events through Socket.IO.
 */
async function sendNotification(app, {
  userId,
  type,
  title,
  message,
  relatedId = null,
  relatedModel = null
}) {
  try {
    if (!userId || !type || !title || !message) {
      console.warn('[NotificationService] Missing required fields for notification');
      return null;
    }

    // Persist to database
    const notification = new Notification({
      userId,
      type,
      title: title.trim(),
      message: message.trim(),
      relatedId,
      relatedModel,
      isRead: false
    });

    await notification.save();

    // Push real-time event if socket.io is available on express app
    const io = app ? app.get('io') : null;
    if (io) {
      io.to(`user:${userId.toString()}`).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error.message);
    return null;
  }
}

module.exports = { sendNotification };
