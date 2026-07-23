const CACHE_NAME = 'messenger-shell-v1';
const APP_SHELL = ['/', '/manifest.json'];

// --- Install: cache the minimal app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

// --- Activate: clean up old cache versions ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// --- Fetch: network-first for API calls, cache-first for the app shell.
// This is intentionally a *thin* offline layer — it makes the app
// installable and lets the shell load if you're briefly offline, but it
// does not sync messages sent while offline (that would need a proper
// background-sync + local queue, out of scope for this project). ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return; // never cache API responses

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => cached))
  );
});

// --- Push: show a notification when the server sends a push event ---
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Messenger', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Messenger', {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/app' },
    })
  );
});

// --- Notification click: focus an existing tab or open a new one ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
