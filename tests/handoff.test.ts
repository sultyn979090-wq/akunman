/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase } from '../src/storage/db';
import { createAccount, createAccountAccess } from '../src/accounts/account-manager';
import { createServiceWithValidation } from '../src/services/service-manager';
import {
  createHandoffNote,
  getHandoffNotesForService,
  getLatestHandoffNote,
} from '../src/handoff/handoff-manager';

describe('handoff.test', () => {
  let dbCounter = 0;
  beforeEach(() => {
    dbCounter += 1;
  });

  const getTestDbName = () => `test_handoff_db_${Date.now()}_${dbCounter}`;

  it('author_is_active_owner', async () => {
    const db = await getDatabase(getTestDbName());

    const person = await createAccount(
      { ownerName: 'Mega Wulandari', googleEmail: 'mega@gmail.com' },
      db
    );
    const service = await createServiceWithValidation(
      { name: 'Claude', urlTemplate: 'https://claude.ai', usesAuthuser: false, resetRule: { mode: 'duration', hours: 5 } },
      db
    );
    const access = await createAccountAccess({ personId: person.id, serviceId: service.id }, db);

    const note = await createHandoffNote(
      service.id,
      access.id,
      'Proyek arsitektur modul backend selesai dibuat promptnya.',
      { now: new Date('2026-10-29T10:00:00.000Z'), dbInstance: db }
    );

    // authorName harus persis sama dengan ownerName akun aktif (BR-15)
    expect(note.authorName).toBe('Mega Wulandari');
    expect(note.serviceId).toBe(service.id);
    expect(note.text).toContain('Proyek arsitektur modul');
  });

  it('shown_on_switch', async () => {
    const db = await getDatabase(getTestDbName());

    // 2 orang berbeda pada layanan yang sama
    const person1 = await createAccount({ ownerName: 'Mega', googleEmail: 'mega@gmail.com' }, db);
    const person2 = await createAccount({ ownerName: 'Rian', googleEmail: 'rian@gmail.com' }, db);

    const service = await createServiceWithValidation(
      { name: 'DeepSeek', urlTemplate: 'https://chat.deepseek.com', usesAuthuser: false, resetRule: { mode: 'duration', hours: 3 } },
      db
    );

    const access1 = await createAccountAccess({ personId: person1.id, serviceId: service.id }, db);
    const access2 = await createAccountAccess({ personId: person2.id, serviceId: service.id }, db);

    // Person 1 menulis catatan lanjutan pertama jam 09:00
    await createHandoffNote(
      service.id,
      access1.id,
      'Sesi 1: Menghabiskan sisa token untuk refactoring.',
      { now: new Date('2026-10-29T09:00:00.000Z'), dbInstance: db }
    );

    // Person 1 menulis catatan lanjutan kedua jam 10:30
    await createHandoffNote(
      service.id,
      access1.id,
      'Sesi 2: Tolong lanjutkan prompt bagian migration script.',
      { now: new Date('2026-10-29T10:30:00.000Z'), dbInstance: db }
    );

    // Saat Person 2 beralih (switch) ke layanan DeepSeek, ia harus membaca catatan terbaru
    const latestNote = await getLatestHandoffNote(service.id, db);
    expect(latestNote).toBeDefined();
    expect(latestNote?.authorName).toBe('Mega');
    expect(latestNote?.text).toBe('Sesi 2: Tolong lanjutkan prompt bagian migration script.');

    const allNotes = await getHandoffNotesForService(service.id, db);
    expect(allNotes).toHaveLength(2);
    // Terurut dari terbaru ke terlama
    expect(allNotes[0].createdAt).toBe('2026-10-29T10:30:00.000Z');
    expect(allNotes[1].createdAt).toBe('2026-10-29T09:00:00.000Z');
  });
});
