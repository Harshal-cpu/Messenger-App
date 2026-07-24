const dotenv = require('dotenv');

dotenv.config();

const logger = require('./utils/logger');

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — shutting down', { message: err.message, stack: err.stack });
  process.exit(1);
});

const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const app = require('./app');
const connectDB = require('./config/db');
const initSocket = require('./sockets/index');
const startScheduledMessageDispatcher = require('./services/scheduledMessageDispatcher');

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Make io accessible in controllers via req.app.get('io') if needed
app.set('io', io);

/**
 * Optionally attaches the Redis adapter to Socket.IO, which lets multiple
 * server instances (e.g. Render auto-scaling, or a k8s deployment) share
 * Socket.IO events with each other — without it, a message emitted from
 * the instance User A is connected to would never reach User B if they're
 * connected to a different instance.
 *
 * This is entirely optional: if REDIS_URL isn't set, Socket.IO falls back
 * to its default in-memory adapter, which is fine for local dev / a single
 * server instance.
 */
async function attachRedisAdapterIfConfigured() {
  if (!process.env.REDIS_URL) {
    logger.info('REDIS_URL not set — Socket.IO running with in-memory adapter (single instance only).');
    return;
  }

  try {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter connected — ready for horizontal scaling.');
  } catch (err) {
    logger.error('Failed to connect Redis adapter — falling back to in-memory adapter.', {
      message: err.message,
    });
  }
}

const start = async () => {
  await connectDB();
  await attachRedisAdapterIfConfigured();

  initSocket(io);
  startScheduledMessageDispatcher(io);

  httpServer.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION — shutting down', { message: err.message, stack: err.stack });
  httpServer.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => logger.info('Process terminated.'));
});

module.exports = httpServer;
