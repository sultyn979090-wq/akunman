/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Service Worker untuk AI Account Manager PWA (TASK-012, TASK-REV-02)
 * Menyediakan cache-first / stale-while-revalidate untuk aset aplikasi statis
 * dan fallback navigasi ter-await untuk mode pesawat / offline.
 */

const CACHE_NAME = 'ai-account-manager-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Precache shell dasar
      try {
        await cache.addAll(STATIC_ASSETS);
      } catch (err) {
        console.warn('Gagal cache beberapa aset dasar:', err);
      }

      // 2. Precache bundel build Vite dari asset-manifest.json jika tersedia
      try {
        const manifestRes = await fetch('./asset-manifest.json');
        if (manifestRes && manifestRes.ok) {
          const manifestAssets = await manifestRes.json();
          if (Array.isArray(manifestAssets)) {
            await cache.addAll(manifestAssets);
          }
        }
      } catch {
        // Lingkungan dev atau jika manifest belum dibuat; lewati tanpa memblokir install
      }
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

  // Jangan cache permintaan POST/PUT/DELETE
  if (event.request.method !== 'GET') {
    return;
  }

  // Lewati mutlak permintaan ke origin luar (Google Apps Script, AI links, external CDNs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first dengan cache fallback untuk dokumen navigasi HTML (SPA routing)
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
          // Evaluasi fallback secara berurutan dan ter-await (bukan Promise-truthy)
          const cachedDirect = await caches.match(event.request);
          if (cachedDirect) return cachedDirect;

          const fallbackHtml = await caches.match('./index.html');
          if (fallbackHtml) return fallbackHtml;

          const fallbackDotSlash = await caches.match('./');
          if (fallbackDotSlash) return fallbackDotSlash;

          const fallbackSlash = await caches.match('/');
          if (fallbackSlash) return fallbackSlash;

          return new Response('Aplikasi sedang offline dan berkas shell belum tersedia di cache.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Cache-first dengan runtime caching & background revalidation untuk aset statis lokal
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Revalidasi di latar belakang bila online (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
        }).catch(() => {
          // Diamkan galat saat offline
        });
        return cachedResponse;
      }

      // Bila belum ada di cache, ambil dari jaringan dan simpan ke cache
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});

