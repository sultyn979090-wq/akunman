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
});
