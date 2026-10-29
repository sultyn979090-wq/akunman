/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import fs from 'fs';
import path from 'path';
import { getDatabase, getAllPersons, getAllAccess } from '../src/storage/db';
import { createAccount, createAccountAccess } from '../src/accounts/account-manager';
import { createServiceWithValidation } from '../src/services/service-manager';
import { getNextReadyAccountSuggestion } from '../src/ui/dashboard-helper';

describe('TASK-012: Hardening PWA, Offline & Uji Akhir', () => {
  let dbCounter = 0;
  beforeEach(() => {
    dbCounter += 1;
  });

  const getTestDbName = () => `test_pwa_offline_${Date.now()}_${dbCounter}`;

  it('e2e.manual::manifest_and_sw_integrity - Memvalidasi kepatuhan PWA Manifest dan Service Worker', () => {
    // 1. Verifikasi manifest.webmanifest
    const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifestContent.name).toBe('AI Account Manager');
    expect(manifestContent.short_name).toBeDefined();
    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.start_url).toBe('./');
    expect(manifestContent.icons.length).toBeGreaterThanOrEqual(2);

    // Pastikan berkas ikon fisik tersedia
    const icon192 = path.resolve(process.cwd(), 'public/icon-192.svg');
    const icon512 = path.resolve(process.cwd(), 'public/icon-512.svg');
    expect(fs.existsSync(icon192)).toBe(true);
    expect(fs.existsSync(icon512)).toBe(true);

    // 2. Verifikasi sw.js
    const swPath = path.resolve(process.cwd(), 'public/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain('CACHE_NAME');
    expect(swContent).toContain("addEventListener('install'");
    expect(swContent).toContain("addEventListener('fetch'");
    expect(swContent).toContain('caches.match');
  });

  it('e2e.manual::full_switch_flow - Alur switch cepat antar-akun <= 2 ketukan', async () => {
    const db = await getDatabase(getTestDbName());

    const s = await createServiceWithValidation(
      {
        id: 'svc-claude',
        name: 'Anthropic Claude',
        urlTemplate: 'https://claude.ai',
        usesAuthuser: false,
        resetRule: { mode: 'duration', hours: 5 },
      },
      db
    );

    // Buat akun
    const p1 = await createAccount({ ownerName: 'Alice', googleEmail: 'alice@example.com' }, db);
    const p2 = await createAccount({ ownerName: 'Bob', googleEmail: 'bob@example.com' }, db);

    // p1 limited, p2 ready
    const a1 = await createAccountAccess(
      {
        personId: p1.id,
        serviceId: s.id,
        loginMethod: 'google',
      },
      db
    );

    // Set p1 status ke limited dengan resetAt di masa depan
    const tx = db.transaction('access', 'readwrite');
    const a1Record = await tx.objectStore('access').get(a1.id);
    a1Record.status = 'limited';
    a1Record.resetAt = new Date(Date.now() + 3600000).toISOString();
    await tx.objectStore('access').put(a1Record);
    await tx.done;

    const a2 = await createAccountAccess(
      {
        personId: p2.id,
        serviceId: s.id,
        loginMethod: 'google',
      },
      db
    );

    const allAcc = await getAllAccess(db);
    const allPers = await getAllPersons(db);

    // Rekomendasi akun berikutnya langsung mengarahkan ke akun ready (Bob)
    const suggestion = getNextReadyAccountSuggestion(s.id, p1.id, allAcc, allPers);
    expect(suggestion.suggestedAccess).not.toBeNull();
    expect(suggestion.suggestedPerson?.ownerName).toBe('Bob');
    expect(suggestion.suggestedAccess?.id).toBe(a2.id);
  });

  it('nfr1::accounts_load_under_1_second - Pengambilan data akun IndexedDB tampil < 1 detik (NFR 1)', async () => {
    const db = await getDatabase(getTestDbName());

    // Isi 10 akun maksimum (BR-07)
    for (let i = 1; i <= 10; i++) {
      await createAccount(
        {
          ownerName: `User ${i}`,
          googleEmail: `user${i}@example.com`,
          label: `Label ${i}`,
        },
        db
      );
    }

    const start = performance.now();
    const fetched = await getAllPersons(db);
    const durationMs = performance.now() - start;

    expect(fetched.length).toBe(10);
    // NFR 1 mengharuskan < 1000ms; IndexedDB umumnya selesai dalam < 50ms
    expect(durationMs).toBeLessThan(1000);
  });

  it('security::zero_password_or_token_stored - Memastikan tidak ada kolom kata sandi atau token auth', async () => {
    const db = await getDatabase(getTestDbName());

    const person = await createAccount(
      {
        ownerName: 'Security Check',
        googleEmail: 'sec@example.com',
      },
      db
    );

    const personKeys = Object.keys(person);
    expect(personKeys).not.toContain('password');
    expect(personKeys).not.toContain('token');
    expect(personKeys).not.toContain('secret');
    expect(personKeys).not.toContain('authKey');

    const service = await createServiceWithValidation(
      {
        name: 'Test Svc',
        urlTemplate: 'https://test.example.com',
        usesAuthuser: false,
        resetRule: { mode: 'pacific_midnight' },
      },
      db
    );

    const access = await createAccountAccess(
      {
        personId: person.id,
        serviceId: service.id,
        loginMethod: 'google',
      },
      db
    );

    const accessKeys = Object.keys(access);
    expect(accessKeys).not.toContain('password');
    expect(accessKeys).not.toContain('token');
    expect(accessKeys).not.toContain('credentials');
  });

  describe('TASK-REV-02: Service Worker Lifecycle & Offline Hardening', () => {
    const loadSwContext = (initialCache: Record<string, any> = {}, customFetch?: any) => {
      const handlers: Record<string, (e: any) => void> = {};
      const cacheStorage = new Map<string, any>(Object.entries(initialCache));
      const addedToCache: string[] = [];
      const deletedCaches: string[] = [];
      const claimed = { value: false };

      const mockCache = {
        addAll: async (urls: string[]) => {
          addedToCache.push(...urls);
          urls.forEach((u) => cacheStorage.set(u, new Response('cached:' + u, { status: 200 })));
        },
        put: async (req: any, res: any) => {
          const key = typeof req === 'string' ? req : req.url;
          cacheStorage.set(key, res);
        },
        match: async (req: any) => {
          const key = typeof req === 'string' ? req : req.url;
          return cacheStorage.get(key) || undefined;
        },
      };

      const caches = {
        open: async () => mockCache,
        keys: async () => ['ai-account-manager-v1', 'ai-account-manager-v2'],
        delete: async (name: string) => {
          deletedCaches.push(name);
          return true;
        },
        match: async (req: any) => {
          const key = typeof req === 'string' ? req : req.url;
          return cacheStorage.get(key) || undefined;
        },
      };

      const swCtx = {
        self: {
          addEventListener: (event: string, fn: any) => {
            handlers[event] = fn;
          },
          skipWaiting: () => Promise.resolve(),
          clients: {
            claim: () => {
              claimed.value = true;
              return Promise.resolve();
            },
          },
          location: { origin: 'https://example.com' },
        },
        caches,
        fetch:
          customFetch ||
          (async (req: any) => {
            const url = typeof req === 'string' ? req : req.url;
            if (url.includes('asset-manifest.json')) {
              return {
                ok: true,
                status: 200,
                json: async () => ['./assets/index-rev02.js', './assets/index-rev02.css'],
              };
            }
            return new Response('network-response', { status: 200 });
          }),
        console,
        URL,
        Response,
        Promise,
      };

      const swPath = path.resolve(process.cwd(), 'public/sw.js');
      const swCode = fs.readFileSync(swPath, 'utf-8');
      const { Script } = require('node:vm');
      const script = new Script(swCode);
      script.runInNewContext(swCtx);

      return { handlers, caches, mockCache, addedToCache, cacheStorage, deletedCaches, claimed };
    };

    it('sw_precache_assets - Precache shell dasar dan manifest bundel build Vite', async () => {
      const { handlers, addedToCache } = loadSwContext();
      expect(handlers.install).toBeDefined();

      let installPromise: Promise<void> | null = null;
      handlers.install({
        waitUntil: (p: Promise<void>) => {
          installPromise = p;
        },
      });

      await installPromise;

      // Verifikasi shell dasar tercache
      expect(addedToCache).toContain('./');
      expect(addedToCache).toContain('./index.html');
      expect(addedToCache).toContain('./manifest.webmanifest');
      expect(addedToCache).toContain('./icon-192.svg');
      expect(addedToCache).toContain('./icon-512.svg');

      // Verifikasi bundel build ter-precache dari asset-manifest.json
      expect(addedToCache).toContain('./assets/index-rev02.js');
      expect(addedToCache).toContain('./assets/index-rev02.css');
    });

    it('sw_navigation_fallback_offline - Navigasi offline menyelesaikan fallback ter-await tanpa Promise-truthy bug', async () => {
      const fallbackHtml = new Response('<!doctype html><html><body>AI Account Manager</body></html>', { status: 200 });
      const { handlers } = loadSwContext(
        { './index.html': fallbackHtml },
        async () => {
          throw new Error('Airplane mode / network down');
        }
      );

      expect(handlers.fetch).toBeDefined();

      let respondedPromise: Promise<Response> | null = null;
      handlers.fetch({
        request: {
          url: 'https://example.com/dashboard',
          method: 'GET',
          mode: 'navigate',
        },
        respondWith: (p: Promise<Response>) => {
          respondedPromise = p;
        },
      });

      expect(respondedPromise).not.toBeNull();
      const res = await respondedPromise!;
      expect(res).toBeDefined();
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('AI Account Manager');
    });

    it('sw_static_asset_cache_first - Aset statis melayani cache-first dan melakukan runtime cache untuk aset baru', async () => {
      const cachedAsset = new Response('console.log("cached js")', { status: 200 });
      const { handlers, cacheStorage } = loadSwContext(
        { 'https://example.com/assets/cached.js': cachedAsset },
        async (req: any) => new Response('network:' + (typeof req === 'string' ? req : req.url), { status: 200 })
      );

      // 1. Aset yang sudah ada di cache dikembalikan langsung
      let cacheHitPromise: Promise<Response> | null = null;
      handlers.fetch({
        request: {
          url: 'https://example.com/assets/cached.js',
          method: 'GET',
          mode: 'cors',
        },
        respondWith: (p: Promise<Response>) => {
          cacheHitPromise = p;
        },
      });
      const hitRes = await cacheHitPromise!;
      expect(await hitRes.text()).toBe('console.log("cached js")');

      // 2. Aset baru yang belum ada di cache diambil dari network dan dicache
      let cacheMissPromise: Promise<Response> | null = null;
      handlers.fetch({
        request: {
          url: 'https://example.com/assets/new-chunk.js',
          method: 'GET',
          mode: 'cors',
        },
        respondWith: (p: Promise<Response>) => {
          cacheMissPromise = p;
        },
      });
      const missRes = await cacheMissPromise!;
      expect(await missRes.text()).toBe('network:https://example.com/assets/new-chunk.js');
      expect(cacheStorage.has('https://example.com/assets/new-chunk.js')).toBe(true);
    });

    it('sw_ignores_external_origins - Permintaan eksternal dan non-GET diabaikan tanpa disentuh SW', async () => {
      const { handlers } = loadSwContext();

      // Permintaan POST
      let postResponded = false;
      handlers.fetch({
        request: {
          url: 'https://example.com/api/test',
          method: 'POST',
          mode: 'cors',
        },
        respondWith: () => {
          postResponded = true;
        },
      });
      expect(postResponded).toBe(false);

      // Permintaan ke origin eksternal (Google Apps Script)
      let externalResponded = false;
      handlers.fetch({
        request: {
          url: 'https://script.google.com/macros/s/xyz/exec',
          method: 'GET',
          mode: 'cors',
        },
        respondWith: () => {
          externalResponded = true;
        },
      });
      expect(externalResponded).toBe(false);
    });

    it('sw_activate_cache_eviction - Menghapus cache versi lama saat aktivasi dan memanggil clients.claim()', async () => {
      const { handlers, deletedCaches, claimed } = loadSwContext();
      expect(handlers.activate).toBeDefined();

      let activatePromise: Promise<void> | null = null;
      handlers.activate({
        waitUntil: (p: Promise<void>) => {
          activatePromise = p;
        },
      });

      await activatePromise;
      expect(deletedCaches).toContain('ai-account-manager-v1');
      expect(deletedCaches).not.toContain('ai-account-manager-v2');
      expect(claimed.value).toBe(true);
    });
  });
});

