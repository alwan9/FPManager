const CACHE_NAME = 'fpmanager-v209';

const urlsToCache = [
  './',
  './index.html',
  './login.html',
  './pages/proyek.html',
  './pages/tambah-proyek.html',
  './pages/keuangan.html',
  './pages/laporan.html',
  './pages/pengaturan.html',
  './pages/profil.html',
  './pages/invoice.html',
  './pages/history-invoice.html',
  './pages/tools.html',
  './pages/admin-tasks.html',
  './pages/notifikasi.html',
  './pages/user-management.html',
  './pages/maintenance.html',
  './manifest.json',
  './css/style.css',
  './css/darkmode.css',
  './css/tailwind.min.css',
  './js/core/config.js',
  './js/core/i18n.js',
  './js/core/api.js',
  './js/core/theme.js',
  './js/core/toast.js',
  './js/core/pwa.js',
  './js/core/auth.js',
  './js/modules/dashboard.js',
  './js/modules/proyek.js',
  './js/modules/tambah.js',
  './js/modules/keuangan.js',
  './js/modules/laporan.js',
  './js/modules/pengaturan.js',
  './js/modules/profil.js',
  './js/modules/invoice.js',
  './js/modules/history-invoice.js',
  './js/modules/tools.js',
  './js/modules/admin-tasks.js',
  './js/modules/notifikasi.js',
  './js/modules/user-management.js',
  './js/utils/excel.js',
  './js/utils/calendar.js',
  './assets/img/favicon.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/logo.webp',
  './assets/img/qris.jpg',
  './assets/img/ttd.png',
  './assets/watermark/wm_white.png',
  './assets/watermark/wm_black.png',
  './assets/watermark/wm_warna.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => console.warn('Cache add warning for:', url, err))
          )
        );
      })
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

  // Only cache http/https schemes (ignore chrome-extension, ws, etc.)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }

  // Skip caching for external API calls and dynamic Google services
  if (
    url.includes('script.google.com') ||
    url.includes('action=') ||
    url.includes('apiKey=') ||
    url.includes('generativelanguage.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('/ws')
  ) {
    return;
  }

  // Stale-While-Revalidate strategy for static JS and CSS (Instant 0ms delivery + background update)
  if (url.endsWith('.js') || url.endsWith('.css') || event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(async cachedResponse => {
        if (cachedResponse) {
          // Revalidate in background quietly if online
          if (navigator.onLine) {
            fetch(event.request).then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                const responseCopy = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseCopy);
                });
              }
            }).catch(() => { });
          }
          return cachedResponse;
        }

        // Fallback: match relative path in cache
        try {
          const parsedUrl = new URL(url);
          const relativeMatch = await caches.match('.' + parsedUrl.pathname, { ignoreSearch: true }) || await caches.match(parsedUrl.pathname, { ignoreSearch: true });
          if (relativeMatch) return relativeMatch;
        } catch (e) { }

        // Network fallback
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const responseCopy = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, responseCopy);
          }
          return networkResponse;
        } catch (err) {
          console.debug('SW static asset fetch skipped (offline/unreachable):', err);
          return cachedResponse || new Response('', {
            status: 200,
            headers: { 'Content-Type': url.endsWith('.css') || event.request.destination === 'style' ? 'text/css' : 'application/javascript' }
          });
        }
      })
    );
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
          return caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (url.endsWith('.html') || event.request.mode === 'navigate') {
              return caches.match('./index.html', { ignoreSearch: true });
            }
            return Response.error();
          });
        })
    );
    return;
  }

  // Cache-first strategy for local static assets
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              const responseCopy = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseCopy);
              });
            }
            return response;
          })
          .catch(err => {
            console.warn('SW static asset fetch failed:', event.request.url, err);
            return caches.match(event.request).then(fallbackRes => {
              if (fallbackRes) return fallbackRes;
              if (event.request.destination === 'style' || url.endsWith('.css')) {
                return new Response('/* Offline fallback stylesheet */', {
                  headers: { 'Content-Type': 'text/css' }
                });
              }
              if (event.request.destination === 'script' || url.endsWith('.js')) {
                return new Response('// Offline fallback script', {
                  headers: { 'Content-Type': 'application/javascript' }
                });
              }
              return Response.error();
            });
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

// Handle Push Notifications from Server directly to phone
self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Pemberitahuan Super Admin', body: event.data.text() };
    }
  }
  const title = data.title || 'Pemberitahuan Super Admin';
  const options = {
    body: data.body || 'Anda menerima pesan notifikasi baru.',
    icon: './assets/img/icon-192.png',
    badge: './assets/img/favicon.png',
    vibrate: [250, 100, 250],
    renotify: true,
    data: {
      url: data.url || './pages/notifikasi.html'
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click to open/focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : './pages/proyek.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Try to focus existing window/tab
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client && targetUrl) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
