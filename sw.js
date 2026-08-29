const CACHE_NAME = 'fpmanager-v88';













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
  './tools.html',
  './admin-tasks.html',
  './login.html',
  './user-management.html',
  './manifest.json',
  './css/style.css',
  './css/darkmode.css',
  './css/tailwind.min.css',
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
  './js/tools.js',
  './js/theme.js',
  './js/toast.js',
  './js/excel.js',
  './js/admin-tasks.js',
  './js/user-management.js',
  './assets/img/favicon.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/logo.png',
  './assets/img/mockups/tshirt_mockup.jpg',
  './assets/img/mockups/businesscard_mockup.jpg',
  './assets/img/mockups/mug_mockup.jpg',
  './assets/img/mockups/billboard_mockup.jpg',
  './assets/img/mockups/officesign_mockup.jpg',
  './assets/img/mockups/laptop_mockup.jpg',
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
  // Only handle GET requests. Let POST/PUT/DELETE bypass SW to browser native handling.
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url || '';

  // Only cache http/https schemes (ignore chrome-extension, etc.)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }

  // Skip caching for external API calls and CDNs — let browser handle directly
  if (
    url.includes('script.google.com') ||
    url.includes('action=') ||
    url.includes('apiKey=') ||
    url.includes('generativelanguage.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('cdnjs.cloudflare.com') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('unpkg.com')
  ) {
    return;
  }

  // Network-first strategy for HTML pages/navigation
  if (event.request.mode === 'navigate' || url.endsWith('.html') || url.endsWith('/') || !url.includes('.')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseCopy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          });
        })
    );
    return;
  }

  // Cache-first strategy for local static assets
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseCopy);
            });
          }
          return response;
        }).catch(err => {
          console.warn('SW fetch offline/error for:', url, err);
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
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

