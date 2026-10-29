/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeSheetBackup,
  executeSheetRestore,
  PRE_RESTORE_STORAGE_KEY,
  countEntities,
} from '../src/backup/sheet-backup';
import {
  getDatabase,
  createPerson,
  createAccess,
  addLog,
  getSettings,
  saveSettings,
  getAllPersons,
  getAllAccess,
  getLogsByAccessId,
} from '../src/storage/db';
import { createServiceWithValidation } from '../src/services/service-manager';

describe('backup-sheet.test', () => {
  let dbCounter = 0;
  const originalFetch = global.fetch;

  beforeEach(() => {
    dbCounter += 1;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const getTestDbName = () => `test_backup_sheet_db_${Date.now()}_${dbCounter}`;

  const seedTestData = async (db: any) => {
    await saveSettings(
      {
        sheetEndpoint: 'https://script.google.com/macros/s/AKfycb.../exec',
        sheetSecret: 'SUPER_SECRET_KEY_123',
      },
      db
    );

    await createServiceWithValidation(
      {
        id: 'svc-ai-studio',
        name: 'Google AI Studio',
        urlTemplate: 'https://aistudio.google.com/',
        usesAuthuser: true,
        resetRule: { mode: 'pacific_midnight' },
      },
      db
    );

    const p = await createPerson(
      {
        id: 'person-1',
        ownerName: 'Budi Santoso',
        googleEmail: 'budi@example.com',
        label: 'Akun Utama',
        note: 'Akun proyek ZLCE',
      },
      db
    );

    const a = await createAccess(
      {
        id: 'access-1',
        personId: p.id,
        serviceId: 'svc-ai-studio',
        loginMethod: 'google',
        status: 'ready',
      },
      db
    );

    await addLog(
      {
        id: 'log-1',
        accessId: a.id,
        type: 'opened',
        detail: 'Sesi dibuka',
      },
      db
    );
  };

  it('roundtrip_identical - Backup menulis ke Sheet dan Restore memulihkan data identik', async () => {
    const db = await getDatabase(getTestDbName());
    await seedTestData(db);

    let capturedSheetData: any = null;

    global.fetch = vi.fn().mockImplementation(async (_url: string, options: any) => {
      const payload = JSON.parse(options.body);
      if (payload.action === 'backup') {
        capturedSheetData = payload.data;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            message: 'Backup tersimpan di Sheet.',
            backupTimestamp: '2026-10-29T10:10:00Z',
          }),
        };
      }
      if (payload.action === 'restore') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            message: 'Data dibaca dari Sheet.',
            data: capturedSheetData,
          }),
        };
      }
      return { ok: false, status: 400 };
    });

    // 1. Eksekusi Backup
    const backupRes = await executeSheetBackup(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      db
    );
    expect(backupRes.success).toBe(true);
    expect(capturedSheetData).toBeDefined();
    expect(capturedSheetData.persons.length).toBe(1);
    expect(capturedSheetData.persons[0].ownerName).toBe('Budi Santoso');

    // Pastikan rahasia tidak bocor ke data yang dikirim ke Sheet (AC-5, BR-13)
    expect(capturedSheetData.settings.sheetSecret).toBeUndefined();
    expect(capturedSheetData.settings.sheetEndpoint).toBeUndefined();

    // 2. Modifikasi / hapus data lokal untuk membuktikan pemulihan
    const personsBefore = await getAllPersons(db);
    expect(personsBefore.length).toBe(1);

    const txClear = db.transaction(['persons', 'access'], 'readwrite');
    await txClear.objectStore('persons').clear();
    await txClear.objectStore('access').clear();
    await txClear.done;

    expect((await getAllPersons(db)).length).toBe(0);

    // 3. Eksekusi Restore
    const restoreRes = await executeSheetRestore(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      { confirmOverwrite: () => true },
      db
    );

    expect(restoreRes.success).toBe(true);
    const restoredPersons = await getAllPersons(db);
    expect(restoredPersons.length).toBe(1);
    expect(restoredPersons[0].ownerName).toBe('Budi Santoso');
    expect(restoredPersons[0].googleEmail).toBe('budi@example.com');

    // Kredensial lokal settings tetap dipertahankan
    const postSettings = await getSettings(db);
    expect(postSettings.sheetSecret).toBe('SUPER_SECRET_KEY_123');
  });

  it('local_copy_before_restore - Salinan lokal dibuat otomatis sebelum restore menimpa data', async () => {
    const db = await getDatabase(getTestDbName());
    await seedTestData(db);

    let mockStorageContent: Record<string, string> = {};
    const mockStorage: Storage = {
      getItem: (key: string) => mockStorageContent[key] || null,
      setItem: (key: string, val: string) => {
        mockStorageContent[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorageContent[key];
      },
      clear: () => {
        mockStorageContent = {};
      },
      key: () => null,
      length: 0,
    };

    let preRestoreCallbackInvoked = false;
    let preRestoreDataPassed = '';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          services: [],
          persons: [
            {
              id: 'p-new',
              ownerName: 'Siti Rahma',
              googleEmail: 'siti@example.com',
              label: 'Akun Baru',
              note: '',
              createdAt: '2026-10-29T10:00:00Z',
              updatedAt: '2026-10-29T10:00:00Z',
            },
          ],
          access: [],
          logs: [],
          handoffNotes: [],
          settings: { id: 'default', resetTimezone: 'America/Los_Angeles', maxPersons: 10 },
        },
      }),
    } as any);

    const restoreRes = await executeSheetRestore(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      {
        confirmOverwrite: () => true,
        storage: mockStorage,
        onPreRestoreBackup: (snapshot) => {
          preRestoreCallbackInvoked = true;
          preRestoreDataPassed = snapshot;
        },
      },
      db
    );

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.snapshotCreated).toBe(true);
    expect(preRestoreCallbackInvoked).toBe(true);

    // Periksa bahwa salinan lokal yang dibuat sebelum menimpa memuat data lama (Budi Santoso)
    expect(preRestoreDataPassed).toContain('Budi Santoso');
    const storageItem = mockStorage.getItem(PRE_RESTORE_STORAGE_KEY);
    expect(storageItem).toBeDefined();
    expect(storageItem).toContain('Budi Santoso');

    // Data lokal kini telah diperbarui ke Siti Rahma
    const currentPersons = await getAllPersons(db);
    expect(currentPersons[0].ownerName).toBe('Siti Rahma');
  });

  it('corrupt_sheet_rejected - Data Sheet rusak ditolak tanpa mengubah data lokal', async () => {
    const db = await getDatabase(getTestDbName());
    await seedTestData(db);

    // Simulasi respons Sheet dengan struktur data yang rusak (services bukan array)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          services: 'Bukan Array Yang Benar',
          persons: [],
          access: [],
          logs: [],
          handoffNotes: [],
        },
      }),
    } as any);

    const restoreRes = await executeSheetRestore(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      { confirmOverwrite: () => true },
      db
    );

    expect(restoreRes.success).toBe(false);
    expect(restoreRes.message).toContain('Data Sheet tidak valid atau rusak');

    // Buktikan bahwa data lokal tetap utuh dan tidak terhapus
    const currentPersons = await getAllPersons(db);
    expect(currentPersons.length).toBe(1);
    expect(currentPersons[0].ownerName).toBe('Budi Santoso');
  });

  it('errors_leave_data_intact - Endpoint salah atau kunci ditolak menampilkan error dan data lokal aman', async () => {
    const db = await getDatabase(getTestDbName());
    await seedTestData(db);

    // 1. Error HTTP / Jaringan
    global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected / CORS error'));

    const resNetworkError = await executeSheetRestore(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      { confirmOverwrite: () => true },
      db
    );

    expect(resNetworkError.success).toBe(false);
    expect(resNetworkError.message).toContain('Network disconnected');
    expect((await getAllPersons(db))[0].ownerName).toBe('Budi Santoso');

    // 2. Kunci salah (403 dari Apps Script)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: false,
        error: 'Akses ditolak: Kunci rahasia salah atau tidak disediakan.',
      }),
    } as any);

    const resWrongKey = await executeSheetRestore(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'WRONG_KEY',
      { confirmOverwrite: () => true },
      db
    );

    expect(resWrongKey.success).toBe(false);
    expect(resWrongKey.message).toContain('Akses ditolak');
    expect((await getAllPersons(db))[0].ownerName).toBe('Budi Santoso');
  });

  it('restore_aborts_when_snapshot_fails - Fail-Closed: Jika pembuatan salinan pengaman gagal, restore harus dibatalkan tanpa mengubah IndexedDB (AC-1)', async () => {
    const db = await getDatabase(getTestDbName());
    await seedTestData(db);

    // Mock respon remote yang valid (berisi akun Siti Rahma)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          services: [],
          persons: [
            {
              id: 'person-siti',
              ownerName: 'Siti Rahma',
              googleEmail: 'siti@example.com',
              label: 'Akun Kedua',
              note: '',
              createdAt: '2026-10-29T10:00:00Z',
              updatedAt: '2026-10-29T10:00:00Z',
            },
          ],
          access: [],
          logs: [],
          handoffNotes: [],
          settings: { id: 'default', resetTimezone: 'America/Los_Angeles', maxPersons: 10 },
        },
      }),
    } as any);

    // Mock storage yang gagal menulis (simulasi Storage QuotaExceededError)
    const failingStorage: Storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError: LocalStorage quota exceeded');
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };

    const restoreRes = await executeSheetRestore(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      {
        confirmOverwrite: () => true,
        storage: failingStorage,
      },
      db
    );

    // Verifikasi pemulihan dibatalkan (Fail-Closed)
    expect(restoreRes.success).toBe(false);
    expect(restoreRes.snapshotCreated).toBe(false);
    expect(restoreRes.message).toContain('salinan pengaman gagal dibuat');

    // Verifikasi data lokal di IndexedDB sama sekali TIDAK diubah atau dihapus
    const personsAfter = await getAllPersons(db);
    expect(personsAfter.length).toBe(1);
    expect(personsAfter[0].ownerName).toBe('Budi Santoso');
  });

  it('restore_empty_sheet_rejected - Sheet Kosong: Jika Sheet berisi 0 entitas sedangkan DB lokal berisi > 0 entitas, restore ditolak (AC-2)', async () => {
    const db = await getDatabase(getTestDbName());
    await seedTestData(db);

    // Simulasi respons Sheet dengan 0 entitas (lembar kerja kosong / baru)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          services: [],
          persons: [],
          access: [],
          logs: [],
          handoffNotes: [],
          settings: { id: 'default', resetTimezone: 'America/Los_Angeles', maxPersons: 10 },
        },
      }),
    } as any);

    const restoreRes = await executeSheetRestore(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      { confirmOverwrite: () => true },
      db
    );

    // Verifikasi penolakan pemulihan sheet kosong
    expect(restoreRes.success).toBe(false);
    expect(restoreRes.message).toContain('Sheet kosong (0 entitas)');
    expect(restoreRes.message).toContain('Data lokal tidak diubah');

    // Verifikasi data lokal tetap utuh
    const personsAfter = await getAllPersons(db);
    expect(personsAfter.length).toBe(1);
    expect(personsAfter[0].ownerName).toBe('Budi Santoso');
  });

  it('restore_confirmation_with_counts - Konfirmasi Overwrite menerima perbandingan entitas remote vs local (AC-3)', async () => {
    const db = await getDatabase(getTestDbName());
    await seedTestData(db); // Ada 1 service, 1 person, 1 access, 1 log -> total 4 entitas

    // Respons Sheet memiliki 2 persons dan 1 service -> total 3 entitas
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          services: [
            {
              id: 'svc-remote',
              name: 'Remote Service',
              urlTemplate: 'https://example.com/',
              usesAuthuser: false,
              resetRule: { mode: 'manual' },
              createdAt: '2026-10-29T10:00:00Z',
              updatedAt: '2026-10-29T10:00:00Z',
            },
          ],
          persons: [
            {
              id: 'p1',
              ownerName: 'Remote 1',
              googleEmail: 'r1@example.com',
              label: '',
              note: '',
              createdAt: '2026-10-29T10:00:00Z',
              updatedAt: '2026-10-29T10:00:00Z',
            },
            {
              id: 'p2',
              ownerName: 'Remote 2',
              googleEmail: 'r2@example.com',
              label: '',
              note: '',
              createdAt: '2026-10-29T10:00:00Z',
              updatedAt: '2026-10-29T10:00:00Z',
            },
          ],
          access: [],
          logs: [],
          handoffNotes: [],
          settings: { id: 'default', resetTimezone: 'America/Los_Angeles', maxPersons: 10 },
        },
      }),
    } as any);

    let capturedCounts: any = null;
    const confirmOverwrite = vi.fn(({ remote, local }) => {
      capturedCounts = { remote, local };
      return false; // Pengguna membatalkan
    });

    const restoreRes = await executeSheetRestore(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      { confirmOverwrite },
      db
    );

    expect(confirmOverwrite).toHaveBeenCalledTimes(1);
    expect(capturedCounts).toBeDefined();
    expect(capturedCounts.remote.persons).toBe(2);
    expect(capturedCounts.remote.services).toBe(1);
    expect(capturedCounts.remote.total).toBe(3);

    expect(capturedCounts.local.persons).toBe(1);
    expect(capturedCounts.local.services).toBe(1);
    expect(capturedCounts.local.access).toBe(1);
    expect(capturedCounts.local.logs).toBe(1);
    expect(capturedCounts.local.total).toBe(4);

    expect(restoreRes.success).toBe(false);
    expect(restoreRes.message).toContain('dibatalkan oleh pengguna');
    expect((await getAllPersons(db))[0].ownerName).toBe('Budi Santoso');
  });

  it('roundtrip_preserves_optional_fields - Properti opsional (limitedAt, resetAt, durationSec) terjaga utuh dalam skema (AC-4)', async () => {
    const db = await getDatabase(getTestDbName());

    await saveSettings(
      {
        sheetEndpoint: 'https://script.google.com/macros/s/AKfycb.../exec',
        sheetSecret: 'SUPER_SECRET_KEY_123',
      },
      db
    );

    await createServiceWithValidation(
      {
        id: 'svc-test-opt',
        name: 'Service Optional Test',
        urlTemplate: 'https://example.com/',
        usesAuthuser: false,
        resetRule: { mode: 'pacific_midnight' },
      },
      db
    );

    const p = await createPerson(
      {
        id: 'p-opt-1',
        ownerName: 'Ahmad Dahlan',
        googleEmail: 'ahmad@example.com',
        label: 'Akun Uji',
        note: 'Catatan [1] kurung siku dan kurung kurawal {}',
      },
      db
    );

    const a = await createAccess(
      {
        id: 'access-opt-1',
        personId: p.id,
        serviceId: 'svc-test-opt',
        loginMethod: 'google',
        status: 'limited',
        limitedAt: '2026-10-29T08:30:00.000Z',
        resetAt: '2026-10-30T07:00:00.000Z',
      },
      db
    );

    await addLog(
      {
        id: 'log-opt-1',
        accessId: a.id,
        type: 'stop',
        at: '2026-10-29T08:30:00.000Z',
        durationSec: 360,
        detail: 'Sesi dihentikan dengan durasi tercatat',
      },
      db
    );

    let transmittedSheetData: any = null;

    global.fetch = vi.fn().mockImplementation(async (_url: string, options: any) => {
      const payload = JSON.parse(options.body);
      if (payload.action === 'backup') {
        transmittedSheetData = payload.data;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            message: 'Backup tersimpan di Sheet.',
            backupTimestamp: '2026-10-29T12:00:00Z',
          }),
        };
      }
      if (payload.action === 'restore') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            message: 'Data dibaca dari Sheet.',
            data: transmittedSheetData,
          }),
        };
      }
      return { ok: false, status: 400 };
    });

    // 1. Jalankan Backup
    const backupRes = await executeSheetBackup(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      db
    );
    expect(backupRes.success).toBe(true);

    // Verifikasi payload yang dikirim memuat properti opsional
    expect(transmittedSheetData.access[0].limitedAt).toBe('2026-10-29T08:30:00.000Z');
    expect(transmittedSheetData.access[0].resetAt).toBe('2026-10-30T07:00:00.000Z');
    expect(transmittedSheetData.logs[0].durationSec).toBe(360);

    // 2. Kosongkan IndexedDB lokal
    const txClear = db.transaction(['persons', 'access', 'logs', 'services'], 'readwrite');
    await txClear.objectStore('persons').clear();
    await txClear.objectStore('access').clear();
    await txClear.objectStore('logs').clear();
    await txClear.objectStore('services').clear();
    await txClear.done;

    expect((await getAllPersons(db)).length).toBe(0);

    // 3. Jalankan Restore
    const restoreRes = await executeSheetRestore(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      { confirmOverwrite: () => true },
      db
    );
    expect(restoreRes.success).toBe(true);

    // 4. Verifikasi bahwa data yang dipulihkan mempertahankan seluruh properti opsional
    const restoredAccess = await getAllAccess(db);
    expect(restoredAccess.length).toBe(1);
    expect(restoredAccess[0].limitedAt).toBe('2026-10-29T08:30:00.000Z');
    expect(restoredAccess[0].resetAt).toBe('2026-10-30T07:00:00.000Z');

    const restoredLogs = await getLogsByAccessId(a.id, db);
    expect(restoredLogs.length).toBe(1);
    expect(restoredLogs[0].durationSec).toBe(360);

    const restoredPerson = (await getAllPersons(db))[0];
    expect(restoredPerson.note).toBe('Catatan [1] kurung siku dan kurung kurawal {}');
  });

  it('corrupt_relational_sheet_rejected - Restore Sheet dengan data relasional rusak (Access yatim / Log tanpa string ISO) ditolak aman tanpa ubah data lokal', async () => {
    const db = await getDatabase(getTestDbName());
    await seedTestData(db); // Ada akun Budi Santoso

    // Simulasi data dari Google Sheets yang cacat relasional (Access merujuk Person tidak ada)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          services: [
            {
              id: 'svc-1',
              name: 'Valid Service',
              urlTemplate: 'https://example.com/',
              usesAuthuser: false,
              resetRule: { mode: 'manual' },
            },
          ],
          persons: [
            {
              id: 'person-valid',
              ownerName: 'Orang Sah',
              googleEmail: 'sah@example.com',
            },
          ],
          access: [
            {
              id: 'acc-corrupt',
              personId: 'person-GHOST-ID', // Person tidak terdaftar!
              serviceId: 'svc-1',
              status: 'ready',
            },
          ],
          logs: [],
          handoffNotes: [],
          settings: { id: 'default', resetTimezone: 'America/Los_Angeles', maxPersons: 10 },
        },
      }),
    } as any);

    const restoreRes = await executeSheetRestore(
      'https://script.google.com/macros/s/AKfycb.../exec',
      'SUPER_SECRET_KEY_123',
      { confirmOverwrite: () => true },
      db
    );

    expect(restoreRes.success).toBe(false);
    expect(restoreRes.message).toContain('Data Sheet tidak valid atau rusak');
    expect(restoreRes.message).toContain('Integritas relasional rusak');

    // Data lokal tetap aman tidak terhapus
    const personsAfter = await getAllPersons(db);
    expect(personsAfter.length).toBe(1);
    expect(personsAfter[0].ownerName).toBe('Budi Santoso');
  });
});


