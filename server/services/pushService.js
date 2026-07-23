const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const logger = require('../utils/logger');

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return false; // Push notifications are optional — silently no-op if unconfigured
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
  return true;
}

/**
 * Sends a push notification to every device a user has registered.
 * Prunes subscriptions that the push service reports as gone (410/404) —
 * this happens naturally when a user uninstalls the PWA, clears browser
 * data, or the subscription otherwise expires.
 *
 * @param {string} userId
 * @param {{title: string, body: string, url?: string}} payload
 */
async function sendPushToUser(userId, payload) {
  if (!ensureConfigured()) return;

  const subscriptions = await PushSubscription.find({ user: userId });
  if (subscriptions.length === 0) return;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/app',
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          notificationPayload
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          logger.error('Push notification failed', { message: err.message });
        }
      }
    })
  );
}

module.exports = { sendPushToUser };
