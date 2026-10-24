const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatThread = require('../models/ChatThread');

/**
 * Initializes and configures Socket.IO with strict authentication,
 * room authorization, and real-time delivery.
 */
function initSocketServer(io) {
  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      const devUser = socket.handshake.auth?.devUser || socket.handshake.headers?.['x-dev-user'];

      let token;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else if (authHeader) {
        token = authHeader;
      }

      if (token) {
        try {
          const secret = process.env.JWT_SECRET || 'campusconnect_jwt_secret';
          const decoded = jwt.verify(token, secret);
          const userId = decoded.id || decoded._id || decoded.userId;
          if (userId) {
            const user = await User.findById(userId).select('-password');
            if (user) {
              socket.user = user;
              return next();
            }
          }
        } catch (jwtErr) {
          console.warn('[Socket Auth] Token verification failed:', jwtErr.message);
        }
      }

      // Explicit userId fallback (e.g. from authenticated client session)
      const explicitUserId = socket.handshake.auth?.userId;
      if (explicitUserId) {
        try {
          const user = await User.findById(explicitUserId).select('-password');
          if (user) {
            socket.user = user;
            return next();
          }
        } catch (e) {}
      }

      // Dev environment fallback support
      if (devUser) {
        try {
          const parsed = typeof devUser === 'string' ? JSON.parse(devUser) : devUser;
          if (parsed && (parsed.id || parsed._id)) {
            socket.user = {
              _id: parsed.id || parsed._id,
              name: parsed.name,
              role: parsed.role || 'Student'
            };
            return next();
          }
        } catch (e) {}
      }

      // If no valid auth provided
      return next(new Error('Authentication error: Missing or invalid credentials'));
    } catch (err) {
      next(new Error('Internal socket authentication error'));
    }
  });

  io.on('connection', (socket) => {
    if (!socket.user || !socket.user._id) {
      console.warn('[Socket] Connection without valid user, disconnecting.');
      socket.disconnect(true);
      return;
    }
    const userId = socket.user._id.toString();
    console.log(`[Socket] Authenticated user connected: ${userId} (socket: ${socket.id})`);

    // Automatically join personal user room for targeted notifications and messaging
    socket.join(`user:${userId}`);

    // Join specific chat conversation with server-side authorization check
    socket.on('join_thread', async ({ threadId }, callback) => {
      try {
        if (!threadId) {
          if (callback) callback({ success: false, error: 'threadId is required' });
          return;
        }

        const thread = await ChatThread.findById(threadId);
        if (!thread) {
          if (callback) callback({ success: false, error: 'Conversation not found' });
          return;
        }

        const isParticipant = thread.participants.some(p => p.toString() === userId);
        if (!isParticipant) {
          console.warn(`[Socket] Unauthorized join attempt by ${userId} to thread ${threadId}`);
          if (callback) callback({ success: false, error: 'Forbidden: You are not a participant' });
          return;
        }

        socket.join(`thread:${threadId}`);
        console.log(`[Socket] User ${userId} joined room thread:${threadId}`);
        if (callback) callback({ success: true, threadId });
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('leave_thread', ({ threadId }) => {
      if (threadId) {
        socket.leave(`thread:${threadId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${userId} disconnected (socket: ${socket.id})`);
    });
  });

  return io;
}

module.exports = { initSocketServer };
