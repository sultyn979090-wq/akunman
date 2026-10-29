/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDatabase,
  createPerson,
  createAccess,
  addLog,
  addHandoffNote,
  getAllAccess,
  getAllLogs,
  getHandoffNotesByServiceId,
} from '../src/storage/db';
import {
  createServiceWithValidation,
  updateServiceWithValidation,
  deleteServiceWithCascade,
  seedInitialServices,
  DEFAULT_AI_SERVICES,
} from '../src/services/service-manager';

describe('service.test', () => {
  let dbCounter = 0;
  beforeEach(() => {
    dbCounter += 1;
  });

  const getTestDbName = () => `test_service_db_${Date.now()}_${dbCounter}`;

  it('reject_invalid_scheme', async () => {
    const db = await getDatabase(getTestDbName());

    // 1. Tanpa skema
    await expect(
      createServiceWithValidation(
        {
          name: 'Invalid 1',
          urlTemplate: 'aistudio.google.com',
          usesAuthuser: true,
          resetRule: { mode: 'pacific_midnight' },
        },
        db
      )
    ).rejects.toThrow(/Wajib menggunakan skema http:\/\/ atau https:\/\//);

    // 2. Skema ftp
    await expect(
      createServiceWithValidation(
        {
          name: 'Invalid 2',
          urlTemplate: 'ftp://ftp.example.com',
          usesAuthuser: false,
          resetRule: { mode: 'duration', hours: 3 },
        },
        db
      )
    ).rejects.toThrow(/Wajib menggunakan skema http:\/\/ atau https:\/\//);

    // 3. Skema javascript
    await expect(
      createServiceWithValidation(
        {
          name: 'Invalid 3',
          urlTemplate: 'javascript:alert(1)',
          usesAuthuser: false,
          resetRule: { mode: 'duration', hours: 3 },
        },
        db
      )
    ).rejects.toThrow(/Wajib menggunakan skema http:\/\/ atau https:\/\//);

    // 4. Update dengan skema salah
    const valid = await createServiceWithValidation(
      {
        name: 'Valid Service',
        urlTemplate: 'https://valid.example.com',
        usesAuthuser: false,
        resetRule: { mode: 'duration', hours: 3 },
      },
      db
    );

    await expect(
      updateServiceWithValidation(
        {
          ...valid,
          urlTemplate: 'invalid-url-no-scheme.com',
        },
        db
      )
    ).rejects.toThrow(/Wajib menggunakan skema http:\/\/ atau https:\/\//);
  });

  it('delete_cascades', async () => {
    const db = await getDatabase(getTestDbName());

    // 1. Buat Service
    const service = await createServiceWithValidation(
      {
        id: 'srv-to-delete',
        name: 'Service To Delete',
        urlTemplate: 'https://example.com/ai',
        usesAuthuser: true,
        resetRule: { mode: 'pacific_midnight' },
      },
      db
    );

    // 2. Buat Person
    const person = await createPerson(
      {
        id: 'person-test',
        ownerName: 'Test User',
        googleEmail: 'test@gmail.com',
        label: 'Tester',
        note: '',
      },
      db
    );

    // 3. Buat Access untuk service ini
    const access = await createAccess(
      {
        id: 'acc-test',
        personId: person.id,
        serviceId: service.id,
        loginMethod: 'google',
        status: 'ready',
      },
      db
    );

    // 4. Buat Log untuk access ini
    await addLog(
      {
        id: 'log-test',
        accessId: access.id,
        type: 'opened',
        detail: 'Sesi dibuka',
      },
      db
    );

    // 5. Buat HandoffNote untuk service ini
    await addHandoffNote(
      {
        id: 'note-test',
        serviceId: service.id,
        accessId: access.id,
        authorName: person.ownerName,
        text: 'Catatan serah terima terkait service ini',
      },
      db
    );

    // Verifikasi semua ada
    expect(await getAllAccess(db)).toHaveLength(1);
    expect(await getAllLogs(db)).toHaveLength(1);
    expect(await getHandoffNotesByServiceId(service.id, db)).toHaveLength(1);

    // Hapus tanpa konfirmasi ditolak
    await expect(deleteServiceWithCascade(service.id, false, db)).rejects.toThrow(
      /memerlukan konfirmasi pengguna/
    );

    // Hapus dengan konfirmasi
    const delResult = await deleteServiceWithCascade(service.id, true, db);
    expect(delResult.success).toBe(true);
    expect(delResult.deletedId).toBe(service.id);

    // Verifikasi cascade: access, logs, dan handoff notes terhapus!
    const remainingAccess = await getAllAccess(db);
    expect(remainingAccess.find((a) => a.serviceId === service.id)).toBeUndefined();

    const remainingLogs = await getAllLogs(db);
    expect(remainingLogs.find((l) => l.accessId === access.id)).toBeUndefined();

    const remainingNotes = await getHandoffNotesByServiceId(service.id, db);
    expect(remainingNotes).toHaveLength(0);
  });

  it('seed_initial_services', async () => {
    const db = await getDatabase(getTestDbName());

    const seeded = await seedInitialServices(db);
    expect(seeded).toHaveLength(5);
    expect(seeded.map((s) => s.name)).toEqual(
      expect.arrayContaining([
        'Google AI Studio',
        'Anthropic Claude',
        'OpenAI ChatGPT',
        'DeepSeek',
        'X (Twitter)',
      ])
    );

    // Memanggil ulang tidak menduplikasi
    const secondCall = await seedInitialServices(db);
    expect(secondCall).toHaveLength(5);
  });
});
