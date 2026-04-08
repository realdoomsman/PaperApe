/// PaperApe Service Worker — PWA Cache Shell
/// Caches the UI shell + Academy text/images for offline/fast mobile loading.

const CACHE_NAME = 'paperape-v2';
const SHELL_URLS = [
  '/',
  '/dashboard',
  '/terminal',
  '/discover',
  '/learn',
  '/leaderboard',
  '/wallets',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clean up old caches
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

// Fetch: Network-first for everything in development
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls and external resources — always network
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) {
    return;
  }

  // Network-first for all same-origin requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the latest version
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || (event.request.mode === 'navigate' ? caches.match('/') : new Response('', { status: 404 }));
        });
      })
  );
});

