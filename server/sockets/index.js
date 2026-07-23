const jwt = require('jsonwebtoken');
const User = require('../models/User');
const registerChatHandlers = require('./chatHandlers');
const registerCallHandlers = require('./callHandlers');
const onlineUsers = require('../utils/onlineUsers');

/**
 * Socket.IO authentication middleware.
 * Expects the client to connect with `auth: { token: <accessToken> }`.
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication token missing'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('User no longer exists'));

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
};

/**
 * Initializes Socket.IO event handlers. Called once from server.js.
 * Chat-specific events (message, typing, read receipts, etc.) are
 * registered here as well, kept in separate handler files per domain
 * as the project grows (see sockets/chatHandlers.js in the chat module).
 */
function initSocket(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const { userId } = socket;

    // Track this socket under the user's online set
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Join a personal room so we can target this user directly from
    // controllers (e.g. friend request notifications) without knowing
    // which socket id they're on.
    socket.join(`user:${userId}`);

    // Mark user online in DB and broadcast to their contacts
    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit('online', { userId });

    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);

    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
          socket.broadcast.emit('offline', { userId, lastSeen: new Date() });
        }
      }
    });
  });
}

module.exports = initSocket;
module.exports.onlineUsers = onlineUsers;
