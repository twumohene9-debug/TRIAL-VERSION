// Service Worker for MCQ Hub
// Enables PWA Standalone Execution, App Shell Caching & Offline Resilience Across All Browsers

const CACHE_NAME = 'mcq-hub-pwa-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install Event - Pre-cache core app shell with fault-tolerant individual caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Pre-caching static app shell for offline route support');
      // Use Promise.allSettled so failure of one optional icon never aborts app shell caching
      await Promise.allSettled(
        STATIC_ASSETS.map(async (assetUrl) => {
          try {
            const response = await fetch(assetUrl, { cache: 'no-cache' });
            if (response && response.status === 200) {
              await cache.put(assetUrl, response);
            }
          } catch (e) {
            console.warn(`[SW] Could not pre-cache asset: ${assetUrl}`, e);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Message Event - Support skipWaiting triggers from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event - Network First with Cache Fallback for offline resilience
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // CRITICAL: Bypass SW Cache for all dynamic APIs & Cloud DB connections
  // Never intercept Firestore, Firebase, Google APIs or custom /api/ routes
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  // Navigation requests (HTML pages & offline quiz URLs with query params)
  // Ensures offline quiz route e.g. /?quiz=XYZ or /?portal=student&quiz=XYZ renders the cached SPA shell
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Cache exact URL and canonical index.html
              cache.put(event.request, responseToCache.clone()).catch(() => {});
              cache.put('/index.html', responseToCache.clone()).catch(() => {});
              cache.put('/', responseToCache).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback for any browser: Match index.html ignoring query params
          const cache = await caches.open(CACHE_NAME);
          const cachedHtml = 
            (await cache.match('/index.html', { ignoreSearch: true })) ||
            (await cache.match('/', { ignoreSearch: true })) ||
            (await cache.match(event.request, { ignoreSearch: true })) ||
            (await caches.match('/index.html', { ignoreSearch: true })) ||
            (await caches.match('/', { ignoreSearch: true }));

          if (cachedHtml) {
            return cachedHtml;
          }

          // Fallback search across any available cache
          const keys = await caches.keys();
          for (const key of keys) {
            const c = await caches.open(key);
            const m = await c.match('/index.html', { ignoreSearch: true });
            if (m) return m;
          }

          return new Response(
            `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Assessment Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui,-apple-system,sans-serif;padding:32px;text-align:center;background:#090d1a;color:#f8fafc;"><h2 style="color:#f59e0b;font-size:22px;margin-bottom:12px;">Examination Portal Offline</h2><p style="color:#94a3b8;font-size:14px;max-width:440px;margin:0 auto 20px auto;line-height:1.6;">The assessment desk is temporarily disconnected. Please ensure you have visited the platform at least once online to cache examination questions.</p><button onclick="window.location.reload()" style="padding:10px 24px;border-radius:12px;background:#f59e0b;color:#090d1a;font-weight:bold;border:none;cursor:pointer;font-size:13px;">Reload Assessment</button></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Static Assets (JS, CSS, Images, Fonts, KaTeX)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          if (event.request.destination === 'image') {
            const fallbackImg = await caches.match('/favicon.svg');
            if (fallbackImg) return fallbackImg;
          }
          return new Response('Asset offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
