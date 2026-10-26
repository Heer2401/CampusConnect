const mongoose = require('mongoose');
const axios = require('axios');

/**
 * Format uptime into human-readable string (e.g. "2h 15m 32s")
 */
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * Inspect MongoDB Connection & Ping Latency
 */
async function checkDatabaseHealth() {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const stateCode = mongoose.connection.readyState;
  const status = readyStates[stateCode] || 'unknown';

  if (stateCode !== 1) {
    return {
      status,
      readyState: stateCode,
      latencyMs: null,
      host: mongoose.connection.host || null,
    };
  }

  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const latencyMs = Date.now() - start;

    return {
      status: 'connected',
      readyState: 1,
      latencyMs,
      host: mongoose.connection.host,
    };
  } catch (error) {
    return {
      status: 'degraded',
      readyState: stateCode,
      latencyMs: null,
      error: error.message,
    };
  }
}

/**
 * Inspect Socket.IO Real-Time Server Performance (Task 10)
 */
function checkRealtimeHealth(io) {
  if (!io) {
    return {
      status: 'not_initialized',
      connectedClients: 0,
      activeRooms: 0,
      engine: 'unavailable',
    };
  }

  try {
    const clientsCount = io.engine?.clientsCount ?? io.sockets?.sockets?.size ?? 0;
    const roomsCount = io.sockets?.adapter?.rooms?.size ?? 0;

    return {
      status: 'operational',
      connectedClients: clientsCount,
      activeRooms: roomsCount,
      transports: io.engine?.opts?.transports || ['polling', 'websocket'],
    };
  } catch (error) {
    return {
      status: 'error',
      connectedClients: 0,
      activeRooms: 0,
      error: error.message,
    };
  }
}

/**
 * Inspect FastAPI AI Microservice Health & Latency (Task 11)
 * Uses a safe 5000ms (5 second) timeout as configured.
 */
async function checkAiServiceHealth() {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const timeoutMs = Number(process.env.AI_HEALTH_TIMEOUT_MS) || 5000;

  try {
    const start = Date.now();
    const response = await axios.get(`${aiServiceUrl}/api/v1/health`, {
      timeout: timeoutMs,
      validateStatus: () => true, // Don't throw on non-200, we inspect status
    });
    const latencyMs = Date.now() - start;

    if (response.status >= 200 && response.status < 300) {
      return {
        status: 'available',
        url: aiServiceUrl,
        latencyMs,
        details: response.data || null,
      };
    }

    return {
      status: 'degraded',
      url: aiServiceUrl,
      httpStatus: response.status,
      latencyMs,
    };
  } catch (error) {
    const isTimeout = error.code === 'ECONNABORTED';
    return {
      status: 'offline',
      url: aiServiceUrl,
      latencyMs: null,
      note: isTimeout
        ? `Request timed out after ${timeoutMs}ms`
        : 'Microservice offline or unreachable',
    };
  }
}

/**
 * GET /api/health
 * Comprehensive Health and Monitoring Endpoint
 */
const getHealthStatus = async (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();

  const io = req.app.get('io');

  // Run external service checks in parallel for maximum performance
  const [dbHealth, aiHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkAiServiceHealth(),
  ]);

  const realtimeHealth = checkRealtimeHealth(io);

  // Overall system health summary
  const isHealthy = dbHealth.status === 'connected' && realtimeHealth.status === 'operational';

  const healthPayload = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    uptimeFormatted: formatUptime(uptimeSeconds),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: dbHealth,
      realtime: realtimeHealth,
      aiService: aiHealth,
    },
    system: {
      memoryUsedMB: Number((memUsage.heapUsed / 1024 / 1024).toFixed(2)),
      memoryTotalMB: Number((memUsage.heapTotal / 1024 / 1024).toFixed(2)),
      rssMB: Number((memUsage.rss / 1024 / 1024).toFixed(2)),
      nodeVersion: process.version,
      platform: process.platform,
    },
  };

  // Always return 200 so monitoring scrapers can parse JSON payload
  return res.status(200).json(healthPayload);
};

module.exports = {
  getHealthStatus,
  checkDatabaseHealth,
  checkRealtimeHealth,
  checkAiServiceHealth,
  formatUptime,
};
