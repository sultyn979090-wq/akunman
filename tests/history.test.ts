/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, addLog } from '../src/storage/db';
import { createAccount, createAccountAccess } from '../src/accounts/account-manager';
import { createServiceWithValidation } from '../src/services/service-manager';
import {
  getAllChronologicalLogs,
  updateAccountNote,
} from '../src/history/history-manager';

describe('history.test', () => {
  let dbCounter = 0;
  beforeEach(() => {
    dbCounter += 1;
  });

  const getTestDbName = () => `test_history_db_${Date.now()}_${dbCounter}`;

  it('ordered_events', async () => {
    const db = await getDatabase(getTestDbName());

    const person = await createAccount(
      { ownerName: 'Bayu', googleEmail: 'bayu@gmail.com', note: 'Catatan awal' },
      db
    );
    const service = await createServiceWithValidation(
      { name: 'Google AI Studio', urlTemplate: 'https://aistudio.google.com', usesAuthuser: true, resetRule: { mode: 'pacific_midnight' } },
      db
    );
    const access = await createAccountAccess({ personId: person.id, serviceId: service.id }, db);

    // Tambah 3 log dengan timestamp berbeda
    await addLog({
      id: 'log-1',
      accessId: access.id,
      type: 'opened',
      at: '2026-10-29T10:00:00.000Z',
      detail: 'Sesi 1 dibuka',
    }, db);

    await addLog({
      id: 'log-2',
      accessId: access.id,
      type: 'stop',
      at: '2026-10-29T10:30:00.000Z',
      durationSec: 1800,
      detail: 'Sesi 1 ditutup',
    }, db);

    await addLog({
      id: 'log-3',
      accessId: access.id,
      type: 'limit_hit',
      at: '2026-10-29T11:00:00.000Z',
      detail: 'Limit tercapai',
    }, db);

    const chronological = await getAllChronologicalLogs(db);
    expect(chronological).toHaveLength(3);
    // Terbaru di atas: log-3 (11:00) -> log-2 (10:30) -> log-1 (10:00)
    expect(chronological[0].log.id).toBe('log-3');
    expect(chronological[1].log.id).toBe('log-2');
    expect(chronological[2].log.id).toBe('log-1');

    // Pengujian update catatan akun (BR-09)
    const updatedPerson = await updateAccountNote(person.id, 'Catatan diperbarui dengan kuota baru', db);
    expect(updatedPerson.note).toBe('Catatan diperbarui dengan kuota baru');
  });
});
