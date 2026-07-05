const CACHE_NAME = 'fpmanager-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './css/darkmode.css',
  './js/config.js',
  './js/api.js',
  './js/pwa.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/theme.js',
  './js/toast.js',
  './assets/img/favicon.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// Handle notification click to open/focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Try to focus existing window/tab
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow('./index.html');
        }
      })
  );
});
