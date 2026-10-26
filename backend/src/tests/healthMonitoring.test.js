const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const mongoose = require('mongoose');

const {
  getHealthStatus,
  checkDatabaseHealth,
  checkRealtimeHealth,
  checkAiServiceHealth,
  formatUptime,
} = require('../controllers/healthController');

// Mock response helper
const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

describe('Tasks 10 & 11 — Health & Performance Monitoring Test Suite', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ENDPOINT PAYLOAD STRUCTURE
  // ──────────────────────────────────────────────────────────────────────────
  describe('Endpoint Contract: GET /api/health', () => {
    test('getHealthStatus returns HTTP 200 with all core service categories', async () => {
      const mockIo = {
        engine: { clientsCount: 3, opts: { transports: ['polling', 'websocket'] } },
        sockets: { adapter: { rooms: new Map([['room1', 1], ['room2', 1]]) } },
      };

      const req = {
        app: {
          get: (key) => (key === 'io' ? mockIo : null),
        },
      };
      const res = createMockRes();

      await getHealthStatus(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(res.body.status, 'Payload must contain overall status');
      assert.ok(res.body.timestamp, 'Payload must contain timestamp');
      assert.ok(typeof res.body.uptimeSeconds === 'number', 'Uptime seconds must be a number');
      assert.ok(res.body.uptimeFormatted, 'Payload must contain formatted uptime string');
      assert.ok(res.body.services, 'Payload must contain services section');
      assert.ok(res.body.system, 'Payload must contain system resource section');

      // Verify services
      assert.ok(res.body.services.database, 'Must inspect database');
      assert.ok(res.body.services.realtime, 'Must inspect real-time service');
      assert.ok(res.body.services.aiService, 'Must inspect AI microservice');

      // Verify system metrics
      assert.ok(typeof res.body.system.memoryUsedMB === 'number');
      assert.ok(typeof res.body.system.memoryTotalMB === 'number');
      assert.ok(res.body.system.nodeVersion);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. REAL-TIME SOCKET.IO MONITORING (TASK 10)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Task 10: Socket.IO Real-Time Observability', () => {
    test('checkRealtimeHealth extracts active clients and room counts from io instance', () => {
      const mockIo = {
        engine: {
          clientsCount: 5,
          opts: { transports: ['polling', 'websocket'] },
        },
        sockets: {
          adapter: {
            rooms: new Map([
              ['user:650c1f1f1f1f1f1f1f1f0001', 1],
              ['thread:650c1f1f1f1f1f1f1f1f0101', 2],
            ]),
          },
        },
      };

      const stats = checkRealtimeHealth(mockIo);

      assert.equal(stats.status, 'operational');
      assert.equal(stats.connectedClients, 5);
      assert.equal(stats.activeRooms, 2);
      assert.deepEqual(stats.transports, ['polling', 'websocket']);
    });

    test('checkRealtimeHealth handles uninitialized or null io instance safely', () => {
      const stats = checkRealtimeHealth(null);

      assert.equal(stats.status, 'not_initialized');
      assert.equal(stats.connectedClients, 0);
      assert.equal(stats.activeRooms, 0);
    });

    test('checkRealtimeHealth catches internal exceptions and marks status as error without crashing', () => {
      const brokenIo = {
        get engine() {
          throw new Error('Engine failure');
        },
      };

      const stats = checkRealtimeHealth(brokenIo);

      assert.equal(stats.status, 'error');
      assert.match(stats.error, /Engine failure/);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. FASTAPI AI MICROSERVICE MONITORING (TASK 11)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Task 11: AI Microservice Observability & Timeout Handling', () => {
    test('checkAiServiceHealth reports available status and tracks latency when AI is responsive', async () => {
      // Mock axios get
      const originalGet = axios.get;
      axios.get = async (url, opts) => {
        assert.ok(opts.timeout >= 5000, 'Must apply at least 5000ms timeout');
        return {
          status: 200,
          data: { status: 'ok', model: 'groq/qwen3.8-27b' },
        };
      };

      try {
        const result = await checkAiServiceHealth();

        assert.equal(result.status, 'available');
        assert.ok(typeof result.latencyMs === 'number', 'Latency must be measured');
        assert.equal(result.details.model, 'groq/qwen3.8-27b');
      } finally {
        axios.get = originalGet;
      }
    });

    test('checkAiServiceHealth gracefully reports offline when service is unreachable without throwing', async () => {
      const originalGet = axios.get;
      axios.get = async () => {
        const err = new Error('Connection refused');
        err.code = 'ECONNREFUSED';
        throw err;
      };

      try {
        const result = await checkAiServiceHealth();

        assert.equal(result.status, 'offline');
        assert.equal(result.latencyMs, null);
        assert.match(result.note, /Microservice offline or unreachable/);
      } finally {
        axios.get = originalGet;
      }
    });

    test('checkAiServiceHealth handles 5000ms timeout abort gracefully', async () => {
      const originalGet = axios.get;
      axios.get = async () => {
        const err = new Error('timeout of 5000ms exceeded');
        err.code = 'ECONNABORTED';
        throw err;
      };

      try {
        const result = await checkAiServiceHealth();

        assert.equal(result.status, 'offline');
        assert.match(result.note, /timed out after/);
      } finally {
        axios.get = originalGet;
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. DATABASE & SYSTEM HEALTH HELPERS
  // ──────────────────────────────────────────────────────────────────────────
  describe('Database & Runtime Metrics Helpers', () => {
    test('checkDatabaseHealth accurately maps Mongoose connection states', async () => {
      // Test when disconnected or connecting
      const health = await checkDatabaseHealth();
      assert.ok(['connected', 'connecting', 'disconnected', 'unknown'].includes(health.status));
      assert.ok(typeof health.readyState === 'number');
    });

    test('formatUptime correctly formats seconds into human-readable string', () => {
      assert.equal(formatUptime(45), '45s');
      assert.equal(formatUptime(125), '2m 5s');
      assert.equal(formatUptime(3665), '1h 1m 5s');
      assert.equal(formatUptime(90065), '1d 1h 1m 5s');
    });
  });

});
