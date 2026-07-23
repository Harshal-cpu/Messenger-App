/**
 * Creates a sliding-window rate limiter for Socket.IO event handlers.
 * REST endpoints already have express-rate-limit, but nothing previously
 * stopped a client from emitting the 'message' event directly at an
 * arbitrary rate, bypassing HTTP rate limiting entirely.
 *
 * Usage:
 *   const messageLimiter = createRateLimiter({ max: 20, windowMs: 10_000 });
 *   if (!messageLimiter.check(socket.userId)) { ...reject... }
 */
function createRateLimiter({ max, windowMs }) {
  const hits = new Map(); // key -> array of timestamps

  function check(key) {
    const now = Date.now();
    const timestamps = (hits.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= max) {
      hits.set(key, timestamps);
      return false;
    }

    timestamps.push(now);
    hits.set(key, timestamps);
    return true;
  }

  // Periodic cleanup so the map doesn't grow unbounded with stale keys
  // (disconnected users, etc.) — runs every 5 minutes.
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const fresh = timestamps.filter((t) => now - t < windowMs);
      if (fresh.length === 0) hits.delete(key);
      else hits.set(key, fresh);
    }
  }, 5 * 60 * 1000).unref();

  return { check };
}

module.exports = createRateLimiter;
