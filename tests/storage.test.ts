/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDatabase,
  createPerson,
  getAllPersons,
  getPersonById,
  updatePerson,
  deletePerson,
  createService,
  getAllServices,
  createAccess,
  getAllAccess,
  addLog,
  getLogsByAccessId,
  addHandoffNote,
  getHandoffNotesByServiceId,
  getSettings,
  saveSettings,
} from '../src/storage/db';

describe('storage.test', () => {
  const TEST_DB_PREFIX = 'test_db_';
  let dbCounter = 0;

  beforeEach(() => {
    dbCounter += 1;
  });

  const getTestDbName = () => `${TEST_DB_PREFIX}${Date.now()}_${dbCounter}`;

  it('crud_roundtrip', async () => {
    const dbName = getTestDbName();
    const db = await getDatabase(dbName);

    // 1. Settings
    const defaultSettings = await getSettings(db);
    expect(defaultSettings.maxPersons).toBe(10);
    const updatedSettings = await saveSettings({ sheetEndpoint: 'https://script.google.com/test' }, db);
    expect(updatedSettings.sheetEndpoint).toBe('https://script.google.com/test');

    // 2. Service
    const service = await createService({
      id: 'srv-1',
      name: 'Google AI Studio',
      urlTemplate: 'https://aistudio.google.com',
      usesAuthuser: true,
      resetRule: { mode: 'pacific_midnight' },
    }, db);
    expect(service.id).toBe('srv-1');
    const allServices = await getAllServices(db);
    expect(allServices).toHaveLength(1);

    // 3. Person
    const person = await createPerson({
      id: 'p-1',
      ownerName: 'Budi Santoso',
      googleEmail: 'budi@gmail.com',
      label: 'Akun Utama',
      note: 'Catatan budi',
    }, db);
    expect(person.ownerName).toBe('Budi Santoso');
    const fetchedPerson = await getPersonById('p-1', db);
    expect(fetchedPerson?.googleEmail).toBe('budi@gmail.com');

    // 4. Access
    const access = await createAccess({
      id: 'acc-1',
      personId: 'p-1',
      serviceId: 'srv-1',
      loginMethod: 'google',
      status: 'ready',
    }, db);
    expect(access.status).toBe('ready');
    const allAccess = await getAllAccess(db);
    expect(allAccess).toHaveLength(1);

    // 5. UsageLog
    const log = await addLog({
      id: 'log-1',
      accessId: 'acc-1',
      type: 'opened',
      detail: 'Membuka Google AI Studio',
    }, db);
    expect(log.type).toBe('opened');
    const logs = await getLogsByAccessId('acc-1', db);
    expect(logs).toHaveLength(1);

    // 6. HandoffNote
    const note = await addHandoffNote({
      id: 'hn-1',
      serviceId: 'srv-1',
      accessId: 'acc-1',
      authorName: 'Budi Santoso',
      text: 'Project prompt review selesai, giliran sesi berikutnya.',
    }, db);
    expect(note.authorName).toBe('Budi Santoso');
    const handoffs = await getHandoffNotesByServiceId('srv-1', db);
    expect(handoffs).toHaveLength(1);
  });

  it('unique_owner_email', async () => {
    const dbName = getTestDbName();
    const db = await getDatabase(dbName);

    await createPerson({
      id: 'p-1',
      ownerName: 'Andi Saputra',
      googleEmail: 'andi@gmail.com',
      label: 'Dev 1',
      note: '',
    }, db);

    // Duplikasi ownerName
    await expect(
      createPerson({
        id: 'p-2',
        ownerName: '  andi saputra  ', // case-insensitive & trimmed
        googleEmail: 'andi2@gmail.com',
        label: 'Dev 2',
        note: '',
      }, db)
    ).rejects.toThrow('sudah terdaftar');

    // Duplikasi googleEmail
    await expect(
      createPerson({
        id: 'p-3',
        ownerName: 'Citra Dewi',
        googleEmail: 'ANDI@gmail.com',
        label: 'Dev 3',
        note: '',
      }, db)
    ).rejects.toThrow('sudah terdaftar');

    // Duplikasi kombinasi personId dan serviceId pada Access
    await createService({
      id: 'srv-test',
      name: 'OpenAI',
      urlTemplate: 'https://chatgpt.com',
      usesAuthuser: false,
      resetRule: { mode: 'duration', hours: 3 },
    }, db);

    await createAccess({
      id: 'acc-1',
      personId: 'p-1',
      serviceId: 'srv-test',
      loginMethod: 'google',
      status: 'ready',
    }, db);

    await expect(
      createAccess({
        id: 'acc-2',
        personId: 'p-1',
        serviceId: 'srv-test',
        loginMethod: 'own',
        status: 'ready',
      }, db)
    ).rejects.toThrow('sudah ada');
  });

  it('max_10_persons', async () => {
    const dbName = getTestDbName();
    const db = await getDatabase(dbName);

    // Buat 10 akun
    for (let i = 1; i <= 10; i++) {
      await createPerson({
        id: `person-${i}`,
        ownerName: `User ${i}`,
        googleEmail: `user${i}@gmail.com`,
        label: `Label ${i}`,
        note: '',
      }, db);
    }

    const currentList = await getAllPersons(db);
    expect(currentList).toHaveLength(10);

    // Akun ke-11 harus ditolak
    await expect(
      createPerson({
        id: 'person-11',
        ownerName: 'User 11',
        googleEmail: 'user11@gmail.com',
        label: 'Label 11',
        note: '',
      }, db)
    ).rejects.toThrow(/Batas maksimal 10 akun Google tercapai/);
  });

  it('migration_keeps_data', async () => {
    const dbName = getTestDbName();
    
    // Buka pada v1
    const dbV1 = await getDatabase(dbName, 1);
    await createPerson({
      id: 'p-migrated',
      ownerName: 'Eko Prasetyo',
      googleEmail: 'eko@gmail.com',
      label: 'Admin',
      note: 'Harus tetap ada setelah migrasi',
    }, dbV1);
    dbV1.close();

    // Naikkan versi ke v2
    const dbV2 = await getDatabase(dbName, 2);
    const personAfterMigration = await getPersonById('p-migrated', dbV2);
    
    expect(personAfterMigration).toBeDefined();
    expect(personAfterMigration?.ownerName).toBe('Eko Prasetyo');
    expect(personAfterMigration?.googleEmail).toBe('eko@gmail.com');
    dbV2.close();
  });
});
