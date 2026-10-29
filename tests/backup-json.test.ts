/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDatabase,
  saveSettings,
  getAllPersons,
  getAllServices,
  getAllAccess,
} from '../src/storage/db';
import { createAccount, createAccountAccess } from '../src/accounts/account-manager';
import { createServiceWithValidation } from '../src/services/service-manager';
import {
  exportLocalJsonData,
  importLocalJsonData,
} from '../src/backup/json-backup';

describe('backup-json.test', () => {
  let dbCounter = 0;
  beforeEach(() => {
    dbCounter += 1;
  });

  const getTestDbName = () => `test_backup_json_db_${Date.now()}_${dbCounter}`;

  it('roundtrip_identical', async () => {
    const db = await getDatabase(getTestDbName());

    const p = await createAccount({ ownerName: 'Joko', googleEmail: 'joko@gmail.com' }, db);
    const s = await createServiceWithValidation(
      { name: 'Google AI Studio', urlTemplate: 'https://aistudio.google.com', usesAuthuser: true, resetRule: { mode: 'pacific_midnight' } },
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

  it('excludes_secrets', async () => {
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

  it('corrupt_rejected', async () => {
    const db = await getDatabase(getTestDbName());

    await createAccount({ ownerName: 'Asli', googleEmail: 'asli@gmail.com' }, db);
    expect(await getAllPersons(db)).toHaveLength(1);

    // 1. String JSON bukan format valid (sintaks error)
    await expect(importLocalJsonData('bukan json { rusak', db)).rejects.toThrow(
      /Format JSON tidak valid/
    );
    // Data lokal tidak berubah
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
      createdAt: '',
      updatedAt: '',
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
    // Data lokal tetap terjaga
    expect(await getAllPersons(db)).toHaveLength(1);
  });
});
