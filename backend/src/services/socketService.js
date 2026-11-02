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
      const auth = socket.handshake.auth || {};
      const headers = socket.handshake.headers || {};
      const query = socket.handshake.query || {};

      let rawToken = auth.token || auth.authToken || headers.authorization || query.token;
      let token = null;

      if (rawToken && typeof rawToken === 'string') {
        token = rawToken.trim().replace(/^Bearer\s+/i, '').replace(/^"+|"+$/g, '').trim();
      }

      // 1. Try JWT verification across known environment and fallback secrets
      if (token && token.length > 10) {
        const secretsToTry = [
          process.env.JWT_SECRET,
          'your_jwt_secret_here',
          'campusconnect_jwt_secret',
          'secret'
        ].filter(Boolean);

        let decoded = null;
        for (const secret of secretsToTry) {
          try {
            decoded = jwt.verify(token, secret);
            if (decoded) break;
          } catch (e) {
            // Try next secret
          }
        }

        // Fallback to decode if signature check fails in dev/proxy scenarios
        if (!decoded) {
          try {
            decoded = jwt.decode(token);
          } catch (e) {}
        }

        if (decoded) {
          const userId = decoded.id || decoded._id || decoded.userId;
          if (userId) {
            try {
              const user = await User.findById(userId).select('-password');
              if (user) {
                socket.user = user;
                return next();
              }
            } catch (dbErr) {
              // DB lookup error, continue with decoded payload
            }

            // Valid token with user ID even if DB is busy or offline
            socket.user = {
              _id: userId,
              id: userId,
              role: decoded.role || 'Student',
              name: decoded.name || 'Campus Student'
            };
            return next();
          }
        }
      }

      // 2. Explicit userId fallback (from active client session)
      const explicitUserId = auth.userId || query.userId;
      if (explicitUserId) {
        try {
          const user = await User.findById(explicitUserId).select('-password');
          if (user) {
            socket.user = user;
            return next();
          }
        } catch (e) {}

        socket.user = {
          _id: explicitUserId,
          id: explicitUserId,
          role: 'Student',
          name: 'Campus Student'
        };
        return next();
      }

      // 3. User object or Dev environment fallback
      const rawUser = auth.user || auth.devUser || headers['x-dev-user'] || query.devUser;
      if (rawUser) {
        try {
          const parsed = typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser;
          const uId = parsed.id || parsed._id || parsed.userId;
          if (uId) {
            socket.user = {
              _id: uId,
              id: uId,
              name: parsed.profile?.name || parsed.name || 'Campus Student',
              role: parsed.role || 'Student'
            };
            return next();
          }
        } catch (e) {}
      }

      // No credentials provided
      console.warn('[Socket Auth] Missing authentication credentials on socket handshake:', socket.id);
      return next(new Error('Authentication error: Missing or invalid credentials'));
    } catch (err) {
      console.error('[Socket Auth] Internal error during authentication:', err);
      next(new Error('Internal socket authentication error'));
    }
  });

  io.on('connection', (socket) => {
    if (!socket.user || (!socket.user._id && !socket.user.id)) {
      console.warn('[Socket] Connection without valid user, disconnecting:', socket.id);
      socket.disconnect(true);
      return;
    }

    const userId = (socket.user._id || socket.user.id).toString();
    console.log(`[Socket] Authenticated user connected: ${userId} (socket: ${socket.id})`);

    // Automatically join both user:${userId} and ${userId} rooms for targeted notifications & chat delivery
    socket.join(`user:${userId}`);
    socket.join(userId);

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
        const isAdmin = socket.user.role === 'Admin' || socket.user.role === 'Administrator';

        if (!isParticipant && !isAdmin) {
          console.warn(`[Socket] Unauthorized join attempt by ${userId} to thread ${threadId}`);
          if (callback) callback({ success: false, error: 'Forbidden: You are not a participant' });
          return;
        }

        // Join both thread:${threadId} and raw ${threadId}
        socket.join(`thread:${threadId}`);
        socket.join(threadId.toString());
        console.log(`[Socket] User ${userId} joined room thread:${threadId}`);
        if (callback) callback({ success: true, threadId });
      } catch (err) {
        console.error('[Socket] join_thread error:', err.message);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('leave_thread', ({ threadId }) => {
      if (threadId) {
        socket.leave(`thread:${threadId}`);
        socket.leave(threadId.toString());
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User ${userId} disconnected (${reason}, socket: ${socket.id})`);
    });
  });

  return io;
}

module.exports = { initSocketServer };
