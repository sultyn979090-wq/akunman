/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDatabase,
  saveSettings,
  getSettings,
  getAllPersons,
  getAllServices,
  getAllAccess,
  getAllLogs,
} from '../src/storage/db';
import { createAccount, createAccountAccess } from '../src/accounts/account-manager';
import { createServiceWithValidation } from '../src/services/service-manager';
import {
  exportLocalJsonData,
  importLocalJsonData,
  validateImportPayload,
} from '../src/backup/json-backup';

describe('backup-json.test', () => {
  let dbCounter = 0;
  beforeEach(() => {
    dbCounter += 1;
  });

  const getTestDbName = () => `test_backup_json_db_${Date.now()}_${dbCounter}`;

  it('roundtrip_identical - Ekspor, kosongkan DB, dan impor menghasilkan data identik', async () => {
    const db = await getDatabase(getTestDbName());

    const p = await createAccount({ ownerName: 'Joko', googleEmail: 'joko@gmail.com' }, db);
    const s = await createServiceWithValidation(
      {
        name: 'Google AI Studio',
        urlTemplate: 'https://aistudio.google.com',
        usesAuthuser: true,
        resetRule: { mode: 'pacific_midnight' },
      },
      db
    );
    await createAccountAccess({ personId: p.id, serviceId: s.id }, db);

    // 1. Ekspor
    const exportedJson = await exportLocalJsonData(db);

    // 2. Kosongkan database
    const tx = db.transaction(['services', 'persons', 'access'], 'readwrite');
    await tx.objectStore('services').clear();
    await tx.objectStore('persons').clear();
    await tx.objectStore('access').clear();
    await tx.done;

    expect(await getAllPersons(db)).toHaveLength(0);
    expect(await getAllServices(db)).toHaveLength(0);

    // 3. Impor kembali
    const importRes = await importLocalJsonData(exportedJson, db);
    expect(importRes.success).toBe(true);

    // 4. Verifikasi data identik
    const restoredPersons = await getAllPersons(db);
    expect(restoredPersons).toHaveLength(1);
    expect(restoredPersons[0].ownerName).toBe('Joko');
    expect(restoredPersons[0].googleEmail).toBe('joko@gmail.com');

    const restoredServices = await getAllServices(db);
    expect(restoredServices).toHaveLength(1);
    expect(restoredServices[0].name).toBe('Google AI Studio');

    const restoredAccess = await getAllAccess(db);
    expect(restoredAccess).toHaveLength(1);
  });

  it('excludes_secrets - sheetEndpoint dan sheetSecret tidak disertakan dalam ekspor JSON', async () => {
    const db = await getDatabase(getTestDbName());

    // Simpan rahasia di Settings
    await saveSettings(
      {
        sheetEndpoint: 'https://script.google.com/macros/s/SECRET_KEY/exec',
        sheetSecret: 'SUPER_SECRET_TOKEN_XYZ',
      },
      db
    );

    const exportedJson = await exportLocalJsonData(db);

    // Pastikan tidak ada token rahasia maupun endpoint di dalam string ekspor (BR-13)
    expect(exportedJson).not.toContain('SUPER_SECRET_TOKEN_XYZ');
    expect(exportedJson).not.toContain('https://script.google.com/macros');

    const parsed = JSON.parse(exportedJson);
    expect(parsed.data.settings.sheetEndpoint).toBeUndefined();
    expect(parsed.data.settings.sheetSecret).toBeUndefined();
  });

  it('corrupt_rejected - Format JSON rusak, bukan array, atau >10 akun ditolak', async () => {
    const db = await getDatabase(getTestDbName());

    await createAccount({ ownerName: 'Asli', googleEmail: 'asli@gmail.com' }, db);
    expect(await getAllPersons(db)).toHaveLength(1);

    // 1. String JSON bukan format valid (sintaks error)
    await expect(importLocalJsonData('bukan json { rusak', db)).rejects.toThrow(
      /Format JSON tidak valid/
    );
    expect(await getAllPersons(db)).toHaveLength(1);

    // 2. Format JSON dengan struktur rusak (bukan array)
    const corruptStructure = JSON.stringify({
      version: 1,
      data: {
        services: 'bukan-array',
        persons: [],
        access: [],
        logs: [],
        handoffNotes: [],
      },
    });
    await expect(importLocalJsonData(corruptStructure, db)).rejects.toThrow(/Skema JSON rusak/);
    expect(await getAllPersons(db)).toHaveLength(1);

    // 3. Data impor dengan lebih dari 10 akun (melanggar BR-07)
    const fake11Persons = Array.from({ length: 11 }, (_, i) => ({
      id: `p-${i}`,
      ownerName: `User ${i}`,
      googleEmail: `user${i}@gmail.com`,
      label: '',
      note: '',
      createdAt: '2026-10-29T10:00:00Z',
      updatedAt: '2026-10-29T10:00:00Z',
    }));
    const over10Json = JSON.stringify({
      version: 1,
      data: {
        services: [],
        persons: fake11Persons,
        access: [],
        logs: [],
        handoffNotes: [],
      },
    });
    await expect(importLocalJsonData(over10Json, db)).rejects.toThrow(
      /melanggar batas maksimal 10 akun/
    );
    expect(await getAllPersons(db)).toHaveLength(1);
  });

  it('rejects_version_mismatch - Menolak versi selain versi 1 (AC-1)', async () => {
    const db = await getDatabase(getTestDbName());
    await createAccount({ ownerName: 'Aman', googleEmail: 'aman@gmail.com' }, db);

    const version2Json = JSON.stringify({
      version: 2,
      data: {
        services: [],
        persons: [],
        access: [],
        logs: [],
        handoffNotes: [],
      },
    });

    await expect(importLocalJsonData(version2Json, db)).rejects.toThrow(
      /Versi skema ekspor\/impor 2 tidak didukung/
    );
    expect(await getAllPersons(db)).toHaveLength(1);
  });

  it('import_ignores_payload_maxPersons_policy - Mengabaikan maxPersons pada payload impor dan menjaga kebijakan lokal (AC-2)', async () => {
    const db = await getDatabase(getTestDbName());
    const initialSettings = await getSettings(db);
    expect(initialSettings.maxPersons).toBe(10);

    const payloadWithMaliciousMax = JSON.stringify({
      version: 1,
      data: {
        services: [],
        persons: [
          {
            id: 'p-1',
            ownerName: 'Alice',
            googleEmail: 'alice@gmail.com',
            createdAt: '2026-10-29T10:00:00Z',
            updatedAt: '2026-10-29T10:00:00Z',
          },
        ],
        access: [],
        logs: [],
        handoffNotes: [],
        settings: {
          maxPersons: 9999, // Percobaan override batas ke 9999 akun (F-05)
          resetTimezone: 'Asia/Jakarta',
        },
      },
    });

    const res = await importLocalJsonData(payloadWithMaliciousMax, db);
    expect(res.success).toBe(true);

    const currentSettings = await getSettings(db);
    expect(currentSettings.maxPersons).toBe(10); // Tetap 10, tidak pernah menjadi 9999!
  });

  it('rejects_orphan_access_and_services - Menolak Access yang merujuk personId atau serviceId yang tidak ada (AC-3)', async () => {
    const db = await getDatabase(getTestDbName());
    await createAccount({ ownerName: 'Tetap', googleEmail: 'tetap@gmail.com' }, db);

    // 1. Access merujuk personId yatim
    const orphanPersonAccess = JSON.stringify({
      version: 1,
      data: {
        services: [
          {
            id: 'svc-1',
            name: 'Service 1',
            urlTemplate: 'https://service1.com',
            usesAuthuser: false,
            resetRule: { mode: 'manual' },
          },
        ],
        persons: [
          {
            id: 'p-real',
            ownerName: 'Real Person',
            googleEmail: 'real@gmail.com',
            createdAt: '2026-10-29T10:00:00Z',
            updatedAt: '2026-10-29T10:00:00Z',
          },
        ],
        access: [
          {
            id: 'acc-1',
            personId: 'p-GHOOOST', // personId tidak ada di daftar persons
            serviceId: 'svc-1',
            status: 'ready',
          },
        ],
        logs: [],
        handoffNotes: [],
      },
    });

    await expect(importLocalJsonData(orphanPersonAccess, db)).rejects.toThrow(
      /Integritas relasional rusak: Access "acc-1" merujuk personId "p-GHOOOST"/
    );
    // Data lokal tidak berubah
    expect(await getAllPersons(db)).toHaveLength(1);

    // 2. Access merujuk serviceId yatim
    const orphanServiceAccess = JSON.stringify({
      version: 1,
      data: {
        services: [],
        persons: [
          {
            id: 'p-real',
            ownerName: 'Real Person',
            googleEmail: 'real@gmail.com',
            createdAt: '2026-10-29T10:00:00Z',
            updatedAt: '2026-10-29T10:00:00Z',
          },
        ],
        access: [
          {
            id: 'acc-2',
            personId: 'p-real',
            serviceId: 'svc-GHOOOST', // serviceId tidak ada di daftar services
            status: 'ready',
          },
        ],
        logs: [],
        handoffNotes: [],
      },
    });

    await expect(importLocalJsonData(orphanServiceAccess, db)).rejects.toThrow(
      /Integritas relasional rusak: Access "acc-2" merujuk serviceId "svc-GHOOOST"/
    );
    expect(await getAllPersons(db)).toHaveLength(1);
  });

  it('rejects_orphan_logs_and_invalid_at_type - Menolak UsageLog yatim atau timestamp non-string (AC-3, AC-4, F-05)', async () => {
    const db = await getDatabase(getTestDbName());
    await createAccount({ ownerName: 'Aman', googleEmail: 'aman@gmail.com' }, db);

    const baseValid = {
      services: [
        {
          id: 'svc-1',
          name: 'Service 1',
          urlTemplate: 'https://service1.com',
          usesAuthuser: false,
          resetRule: { mode: 'manual' },
        },
      ],
      persons: [
        {
          id: 'p-1',
          ownerName: 'Person 1',
          googleEmail: 'person1@gmail.com',
          createdAt: '2026-10-29T10:00:00Z',
          updatedAt: '2026-10-29T10:00:00Z',
        },
      ],
      access: [
        {
          id: 'acc-1',
          personId: 'p-1',
          serviceId: 'svc-1',
          status: 'ready',
        },
      ],
      handoffNotes: [],
    };

    // 1. UsageLog dengan timestamp 'at' berupa angka (simulasi bug E7d audit)
    const logNumberAt = JSON.stringify({
      version: 1,
      data: {
        ...baseValid,
        logs: [
          {
            id: 'log-num',
            accessId: 'acc-1',
            type: 'opened',
            at: 1730198400000, // Angka bukan string ISO -> memicu b.at.localeCompare crash
          },
        ],
      },
    });

    await expect(importLocalJsonData(logNumberAt, db)).rejects.toThrow(
      /Timestamp "at" pada UsageLog "log-num" harus berupa string ISO 8601 yang valid/
    );
    expect(await getAllPersons(db)).toHaveLength(1);

    // 2. UsageLog merujuk accessId yatim
    const orphanLog = JSON.stringify({
      version: 1,
      data: {
        ...baseValid,
        logs: [
          {
            id: 'log-orphan',
            accessId: 'acc-UNKNOWN',
            type: 'opened',
            at: '2026-10-29T10:00:00.000Z',
          },
        ],
      },
    });

    await expect(importLocalJsonData(orphanLog, db)).rejects.toThrow(
      /Integritas relasional rusak: UsageLog "log-orphan" merujuk accessId "acc-UNKNOWN"/
    );
    expect(await getAllPersons(db)).toHaveLength(1);
  });

  it('rejects_limited_access_without_valid_resetAt - Status limited wajib memiliki resetAt ISO yang valid (AC-4)', async () => {
    const db = await getDatabase(getTestDbName());

    const limitedWithoutResetAt = JSON.stringify({
      version: 1,
      data: {
        services: [
          {
            id: 's1',
            name: 'Svc 1',
            urlTemplate: 'https://s1.test',
            usesAuthuser: false,
            resetRule: { mode: 'manual' },
          },
        ],
        persons: [
          {
            id: 'p1',
            ownerName: 'P1',
            googleEmail: 'p1@gmail.com',
            createdAt: '2026-10-29T10:00:00Z',
            updatedAt: '2026-10-29T10:00:00Z',
          },
        ],
        access: [
          {
            id: 'a1',
            personId: 'p1',
            serviceId: 's1',
            status: 'limited',
            // resetAt tidak disertakan
          },
        ],
        logs: [],
        handoffNotes: [],
      },
    });

    await expect(importLocalJsonData(limitedWithoutResetAt, db)).rejects.toThrow(
      /Access "a1" berstatus "limited" tetapi tidak memiliki resetAt bertipe tanggal ISO/
    );
  });

  it('rejects_duplicate_entities_and_pairs - Menolak duplikasi ID atau pasangan (personId, serviceId) (AC-4)', async () => {
    const db = await getDatabase(getTestDbName());

    const duplicateAccessPairs = JSON.stringify({
      version: 1,
      data: {
        services: [
          {
            id: 's1',
            name: 'Svc 1',
            urlTemplate: 'https://s1.test',
            usesAuthuser: false,
            resetRule: { mode: 'manual' },
          },
        ],
        persons: [
          {
            id: 'p1',
            ownerName: 'P1',
            googleEmail: 'p1@gmail.com',
            createdAt: '2026-10-29T10:00:00Z',
            updatedAt: '2026-10-29T10:00:00Z',
          },
        ],
        access: [
          { id: 'a1', personId: 'p1', serviceId: 's1', status: 'ready' },
          { id: 'a2', personId: 'p1', serviceId: 's1', status: 'ready' }, // Duplikasi pasangan p1|s1
        ],
        logs: [],
        handoffNotes: [],
      },
    });

    await expect(importLocalJsonData(duplicateAccessPairs, db)).rejects.toThrow(
      /Duplikasi relasi \(personId, serviceId\) terdeteksi/
    );
  });

  it('rejects_orphan_handoff_notes - Menolak HandoffNote dengan serviceId yang tidak terdaftar (AC-3)', async () => {
    const db = await getDatabase(getTestDbName());

    const orphanHandoff = JSON.stringify({
      version: 1,
      data: {
        services: [
          {
            id: 's1',
            name: 'Svc 1',
            urlTemplate: 'https://s1.test',
            usesAuthuser: false,
            resetRule: { mode: 'manual' },
          },
        ],
        persons: [],
        access: [],
        logs: [],
        handoffNotes: [
          {
            id: 'h1',
            serviceId: 's-UNKNOWN',
            text: 'Catatan untuk layanan tidak dikenal',
            createdAt: '2026-10-29T10:00:00.000Z',
          },
        ],
      },
    });

    await expect(importLocalJsonData(orphanHandoff, db)).rejects.toThrow(
      /Integritas relasional rusak: HandoffNote "h1" merujuk serviceId "s-UNKNOWN"/
    );
  });
});
