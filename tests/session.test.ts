/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, getLogsByAccessId, getAccessById } from '../src/storage/db';
import { createAccount, createAccountAccess } from '../src/accounts/account-manager';
import { createServiceWithValidation } from '../src/services/service-manager';
import {
  openSession,
  stopSession,
  hitLimitSession,
  editLimitResetAt,
  processAutoReadyCheck,
} from '../src/session/session-manager';

describe('session.test', () => {
  let dbCounter = 0;
  beforeEach(() => {
    dbCounter += 1;
  });

  const getTestDbName = () => `test_session_db_${Date.now()}_${dbCounter}`;

  it('open_logs_and_sets_start', async () => {
    const db = await getDatabase(getTestDbName());

    const person = await createAccount(
      { ownerName: 'Siti Rahma', googleEmail: 'siti@gmail.com' },
      db
    );
    const service = await createServiceWithValidation(
      { name: 'Google AI Studio', urlTemplate: 'https://aistudio.google.com', usesAuthuser: true, resetRule: { mode: 'pacific_midnight' } },
      db
    );
    const access = await createAccountAccess({ personId: person.id, serviceId: service.id }, db);

    const now = new Date('2026-10-29T10:00:00.000Z');
    const openRes = await openSession(access.id, { openInBrowser: false, now, dbInstance: db });

    // Verifikasi URL authuser
    expect(openRes.url).toBe('https://aistudio.google.com/?authuser=siti%40gmail.com');

    // Verifikasi activeSessionStart
    const updatedAccess = await getAccessById(access.id, db);
    expect(updatedAccess?.activeSessionStart).toBe('2026-10-29T10:00:00.000Z');

    // Verifikasi UsageLog opened
    const logs = await getLogsByAccessId(access.id, db);
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('opened');
    expect(logs[0].detail).toContain('Google AI Studio');
  });

  it('stop_keeps_ready_with_duration', async () => {
    const db = await getDatabase(getTestDbName());

    const person = await createAccount(
      { ownerName: 'Ahmad', googleEmail: 'ahmad@gmail.com' },
      db
    );
    const service = await createServiceWithValidation(
      { name: 'Claude', urlTemplate: 'https://claude.ai', usesAuthuser: false, resetRule: { mode: 'duration', hours: 5 } },
      db
    );
    const access = await createAccountAccess({ personId: person.id, serviceId: service.id }, db);

    // Buka sesi jam 10:00 UTC
    const startTime = new Date('2026-10-29T10:00:00.000Z');
    await openSession(access.id, { openInBrowser: false, now: startTime, dbInstance: db });

    // Stop sesi 25 menit kemudian (jam 10:25 UTC = 1500 detik)
    const stopTime = new Date('2026-10-29T10:25:00.000Z');
    const stopRes = await stopSession(access.id, { now: stopTime, dbInstance: db });

    // Status tetap ready
    expect(stopRes.access.status).toBe('ready');
    expect(stopRes.durationSec).toBe(1500);

    const updatedAccess = await getAccessById(access.id, db);
    expect(updatedAccess?.status).toBe('ready');
    expect(updatedAccess?.activeSessionStart).toBeUndefined();

    // Verifikasi UsageLog stop
    const logs = await getLogsByAccessId(access.id, db);
    expect(logs).toHaveLength(2); // opened + stop
    const stopLog = logs.find((l) => l.type === 'stop');
    expect(stopLog).toBeDefined();
    expect(stopLog?.durationSec).toBe(1500);
  });

  it('limit_sets_resetAt', async () => {
    const db = await getDatabase(getTestDbName());

    const person = await createAccount(
      { ownerName: 'Rian', googleEmail: 'rian@gmail.com' },
      db
    );
    const service = await createServiceWithValidation(
      { name: 'ChatGPT', urlTemplate: 'https://chatgpt.com', usesAuthuser: false, resetRule: { mode: 'duration', hours: 3 } },
      db
    );
    const access = await createAccountAccess({ personId: person.id, serviceId: service.id }, db);

    const now = new Date('2026-10-29T10:00:00.000Z');

    // Limit hit dengan default 3 jam (target: 13:00 UTC)
    const limitRes = await hitLimitSession(access.id, { now, dbInstance: db });
    expect(limitRes.access.status).toBe('limited');
    expect(limitRes.resetAt.toISOString()).toBe('2026-10-29T13:00:00.000Z');

    const updatedAccess = await getAccessById(access.id, db);
    expect(updatedAccess?.status).toBe('limited');
    expect(updatedAccess?.resetAt).toBe('2026-10-29T13:00:00.000Z');

    // Verifikasi log limit_hit
    const logs = await getLogsByAccessId(access.id, db);
    expect(logs.some((l) => l.type === 'limit_hit')).toBe(true);

    // Koreksi lewat edit resetAt (ke jam 14:00 UTC)
    const newResetTime = new Date('2026-10-29T14:00:00.000Z');
    const editRes = await editLimitResetAt(access.id, newResetTime, { now, dbInstance: db });
    expect(editRes.access.resetAt).toBe('2026-10-29T14:00:00.000Z');

    const accessAfterEdit = await getAccessById(access.id, db);
    expect(accessAfterEdit?.resetAt).toBe('2026-10-29T14:00:00.000Z');
  });

  it('reset_ready_logged_once', async () => {
    const db = await getDatabase(getTestDbName());

    const person = await createAccount(
      { ownerName: 'Nurul', googleEmail: 'nurul@gmail.com' },
      db
    );
    const service = await createServiceWithValidation(
      { name: 'DeepSeek', urlTemplate: 'https://chat.deepseek.com', usesAuthuser: false, resetRule: { mode: 'duration', hours: 2 } },
      db
    );
    const access = await createAccountAccess({ personId: person.id, serviceId: service.id }, db);

    // Set Limit jam 10:00 UTC (resetAt: 12:00 UTC)
    const baseNow = new Date('2026-10-29T10:00:00.000Z');
    await hitLimitSession(access.id, { now: baseNow, dbInstance: db });

    // Cek auto-ready sebelum resetAt (jam 11:30 UTC): masih limited, 0 transisi
    const beforeCheck = await processAutoReadyCheck({ now: new Date('2026-10-29T11:30:00.000Z'), dbInstance: db });
    expect(beforeCheck.transitionedCount).toBe(0);

    // Cek auto-ready setelah resetAt (jam 12:05 UTC): bertransisi ke ready, catat 1 log
    const afterCheck = await processAutoReadyCheck({ now: new Date('2026-10-29T12:05:00.000Z'), dbInstance: db });
    expect(afterCheck.transitionedCount).toBe(1);

    const accessAfter = await getAccessById(access.id, db);
    expect(accessAfter?.status).toBe('ready');
    expect(accessAfter?.resetAt).toBeUndefined();

    // Verifikasi log reset_ready ada
    const logs = await getLogsByAccessId(access.id, db);
    const resetLogs = logs.filter((l) => l.type === 'reset_ready');
    expect(resetLogs).toHaveLength(1);

    // Pemanggilan ulang pada siklus berikutnya tidak boleh menduplikasi log reset_ready
    const secondAfterCheck = await processAutoReadyCheck({ now: new Date('2026-10-29T12:10:00.000Z'), dbInstance: db });
    expect(secondAfterCheck.transitionedCount).toBe(0);

    const logsAfterSecond = await getLogsByAccessId(access.id, db);
    const resetLogsSecond = logsAfterSecond.filter((l) => l.type === 'reset_ready');
    expect(resetLogsSecond).toHaveLength(1); // tetap tepat 1 kali
  });
});
