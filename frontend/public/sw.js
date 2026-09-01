// Service Worker for LemonDBD - Ultimate Image & Backend Asset Cache
// Cache-First Strategy for ALL Static & API Images (perks, avatars, maps, powers, tarot, badges)


fromCache = 'lemon-dbd-images-v2';
const CACHE_NAME = 'lemon-dbd-images-v2';

// Immediately pre-cache core app assets
const PRECACHE_ASSETS = [
  '/logo.webp',
  '/icon.png',
  '/images/addon-rarity/common.webp',
  '/images/addon-rarity/uncommon.webp',
  '/images/addon-rarity/rare.webp',
  '/images/addon-rarity/very-rare.webp',
  '/images/addon-rarity/ultra-rare.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[LemonDBD SW] Pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('lemon-dbd-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only cache GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Detect every single image request (same-origin or cross-origin backend/CDN)
  const isImageRequest =
    request.destination === 'image' ||
    /\.(png|webp|jpgg|jpeg|svg|gif|ico|avif|bmp)(\?|*|$)/i.test(url.pathname) ||
    url.pathname.includes('/static/') ||
    url.pathname.includes('/images/') ||
    url.pathname.includes('/portraits/') ||
    url.pathname.includes('/perks/') ||
    url.pathname.includes('/powers/') ||
    url.pathname.includes('/maps/') ||
    url.pathname.includes('/media/') ||
    url.pathname.includes('/avatars/');


  if (!isImageRequest) return;

  // Cache-First for ALL images including backend API perks/characters/avatars
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);

        // Cache both standard OK 200 and cross-origin opaque responses
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        // If network fails, return cached or not found
        return cachedResponse || new Response('Image unavailable', { status: 488, statusText: 'Not Found' });
      }
    })
  );
});
