const CACHE_NAME = 'fpmanager-v45';
const urlsToCache = [
  './',
  './index.html',
  './proyek.html',
  './tambah-proyek.html',
  './keuangan.html',
  './laporan.html',
  './layanan.html',
  './pengaturan.html',
  './profil.html',
  './invoice.html',
  './login.html',
  './manifest.json',
  './css/style.css',
  './css/darkmode.css',
  './js/config.js',
  './js/i18n.js',
  './js/api.js',
  './js/calendar.js',
  './js/pwa.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/proyek.js',
  './js/tambah.js',
  './js/keuangan.js',
  './js/laporan.js',
  './js/pengaturan.js',
  './js/profil.js',
  './js/invoice.js',
  './js/theme.js',
  './js/toast.js',
  './js/excel.js',
  './assets/img/favicon.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache).catch(err => console.warn('Cache addAll warning:', err)))
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
  // Prevent caching for API requests (Google Apps Script or requests containing sensitive data parameters)
  const url = event.request.url || '';
  if (url.includes('script.google.com') || url.includes('action=') || url.includes('apiKey=')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// Handle Background Sync event
self.addEventListener('sync', event => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        clientList.forEach(client => {
          client.postMessage({ type: 'SYNC_OFFLINE_DATA' });
        });
      })
    );
  }
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

