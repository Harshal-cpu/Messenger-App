const Notification = require('../models/Notification');
const { sendPushToUser } = require('../services/pushService');
const onlineUsers = require('./onlineUsers');

/**
 * Persists a notification and emits it in real time (if the recipient
 * is connected) to their personal Socket.IO room `user:<id>`, which is
 * joined automatically on socket connection (see sockets/index.js).
 *
 * Also sends a Web Push notification if the recipient has no active
 * socket connection (i.e. the app isn't open in any tab) and has
 * registered at least one device for push — no point double-notifying
 * someone who's already looking at the app.
 *
 * @param {object} io - the Socket.IO server instance (req.app.get('io'))
 * @param {{recipient: string, sender?: string, type: string, message: string, relatedId?: string}} data
 */
const notify = async (io, data) => {
  const notification = await Notification.create(data);

  if (io) {
    io.to(`user:${data.recipient}`).emit('newNotification', notification);
  }

  const recipientIsOnline = onlineUsers.has(data.recipient?.toString());
  if (!recipientIsOnline) {
    sendPushToUser(data.recipient, {
      title: 'Messenger',
      body: data.message,
    }).catch(() => {});
  }

  return notification;
};

module.exports = notify;
