const CACHE_NAME = 'fpmanager-v40';
const urlsToCache = [
  './',
  './index.html',
  './proyek.html',
  './tambah-proyek.html',
  './keuangan.html',
  './laporan.html',
  './layanan.html',
  './pengaturan.html',
  './invoice.html',
  './login.html',
  './manifest.json',
  './css/style.css',
  './css/darkmode.css',
  './js/config.js',
  './js/i18n.js',
  './js/api.js',
  './js/pwa.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/proyek.js',
  './js/tambah.js',
  './js/keuangan.js',
  './js/laporan.js',
  './js/pengaturan.js',
  './js/invoice.js',
  './js/theme.js',
  './js/toast.js',
  './js/excel.js',
  './assets/img/favicon.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Clear old cache versions
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
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
