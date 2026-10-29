/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Service Worker untuk AI Account Manager PWA (TASK-012)
 * Menyediakan cache-first / stale-while-revalidate untuk aset aplikasi statis
 * agar aplikasi dapat berjalan sepenuhnya dalam mode pesawat / offline.
 */

const CACHE_NAME = 'ai-account-manager-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Gagal cache beberapa aset awal:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache permintaan POST/PUT/DELETE atau permintaan eksternal (Google Apps Script / link AI)
  if (event.request.method !== 'GET') {
    return;
  }

  // Lewati permintaan Google Apps Script dan layanan eksternal
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first dengan cache fallback untuk dokumen navigasi HTML,
  // Cache-first untuk aset statis (js, css, svg, webmanifest)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match('./index.html') || caches.match('/');
        })
    );
    return;
  }

  // Cache-first atau Stale-While-Revalidate untuk script, style, image
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Mode offline: jika tidak ada di cache dan fetch gagal, kembalikan cachedResponse bila ada
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
