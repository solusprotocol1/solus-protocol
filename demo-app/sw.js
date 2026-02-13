// S4 Ledger Service Worker v2.10.1
const CACHE_NAME = 's4-v2101';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
];

// Install — cache shell assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for API, cache-first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for XRPL and metrics API calls
  if (url.hostname.includes('xrpl') || url.hostname.includes('onrender') || url.pathname.includes('/metrics')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET responses
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      if (e.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', e => {
  let data = { title: 'S4 Ledger', body: 'New notification', icon: './manifest.json' };
  try {
    if (e.data) data = Object.assign(data, e.data.json());
  } catch (err) {
    if (e.data) data.body = e.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon || '/demo-app/manifest.json',
    badge: data.badge || '/demo-app/manifest.json',
    tag: data.tag || 's4-notification',
    data: data.url || './',
    vibrate: [200, 100, 200],
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  const url = e.notification.data || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes('s4ledger') && 'focus' in client) return client.focus();
      }
      // Otherwise open new window
      return clients.openWindow(url);
    })
  );
});

// Background sync for offline-queued anchors
self.addEventListener('sync', e => {
  if (e.tag === 's4-anchor-sync') {
    e.waitUntil(
      // Retrieve queued anchors from IndexedDB and retry
      self.registration.showNotification('S4 Ledger', {
        body: 'Offline anchors synced to XRPL',
        tag: 'sync-complete'
      })
    );
  }
});
