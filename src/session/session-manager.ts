/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IDBPDatabase } from 'idb';
import type { Access, UsageLog, Person, Service } from '../storage/types';
import {
  getAccessById,
  updateAccess,
  getAllAccess,
  getPersonById,
  getServiceById,
  addLog,
} from '../storage/db';
import { buildServiceUrl } from '../domain/url-builder';
import { computeResetAt, validateManualReset } from '../domain/reset-rule';
import {
  transitionToLimited,
  transitionOnStop,
  evaluateAutoReady,
} from '../domain/access-status';

export interface OpenSessionResult {
  url: string;
  access: Access;
  log: UsageLog;
  person: Person;
  service: Service;
}

export interface StopSessionResult {
  access: Access;
  log: UsageLog;
  durationSec?: number;
}

export interface HitLimitResult {
  access: Access;
  log: UsageLog;
  resetAt: Date;
}

export interface AutoReadyCheckResult {
  transitionedCount: number;
  transitionedAccesses: Access[];
}

/**
 * 1. Buka Sesi Pemakaian:
 * - Membuka tautan yang benar di tab baru (jika di browser).
 * - Mencatat log 'opened' di UsageLog.
 * - Menyetel activeSessionStart pada Access.
 */
export async function openSession(
  accessId: string,
  options?: {
    openInBrowser?: boolean;
    now?: Date;
    dbInstance?: IDBPDatabase;
  }
): Promise<OpenSessionResult> {
  const db = options?.dbInstance;
  const now = options?.now || new Date();
  const openInBrowser = options?.openInBrowser !== false;

  const access = await getAccessById(accessId, db);
  if (!access) {
    throw new Error(`Akses dengan ID "${accessId}" tidak ditemukan.`);
  }

  // Jika limited, periksa apakah sudah waktunya auto-ready
  if (access.status === 'limited') {
    const evalRes = evaluateAutoReady(access, now);
    if (evalRes.transitionedToReady) {
      access.status = 'ready';
      access.resetAt = undefined;
      access.limitedAt = undefined;
      await addLog(
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          accessId: access.id,
          type: 'reset_ready',
          at: now.toISOString(),
          detail: 'Otomatis kembali READY sebelum sesi dibuka.',
        },
        db
      );
    } else {
      throw new Error(`Akses ke layanan ini sedang LIMITED hingga ${access.resetAt}. Tidak dapat membuka sesi.`);
    }
  }

  const person = await getPersonById(access.personId, db);
  if (!person) {
    throw new Error(`Data akun pemilik (${access.personId}) tidak ditemukan.`);
  }

  const service = await getServiceById(access.serviceId, db);
  if (!service) {
    throw new Error(`Data layanan (${access.serviceId}) tidak ditemukan.`);
  }

  // Bangun URL dengan authuser encoding bila layanan Google
  const targetUrl = buildServiceUrl(
    service.urlTemplate,
    service.usesAuthuser,
    person.googleEmail
  );

  // Setel waktu mulai sesi aktif
  access.activeSessionStart = now.toISOString();
  await updateAccess(access, db);

  // Catat log 'opened'
  const log = await addLog(
    {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accessId: access.id,
      type: 'opened',
      at: now.toISOString(),
      detail: `Membuka layanan ${service.name} atas nama ${person.ownerName} (${person.googleEmail})`,
    },
    db
  );

  // Buka tab baru di browser jika diizinkan
  if (openInBrowser && typeof window !== 'undefined') {
    try {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // browser pop-up blocker fallback
    }
  }

  return {
    url: targetUrl,
    access,
    log,
    person,
    service,
  };
}

/**
 * 2. Tombol Stop Sesi:
 * - Menghitung durasi sesi (jika activeSessionStart ada).
 * - Status tetap 'ready' (tidak berubah ke limited).
 * - Mencatat log 'stop' dengan durasi.
 */
export async function stopSession(
  accessId: string,
  options?: {
    now?: Date;
    dbInstance?: IDBPDatabase;
  }
): Promise<StopSessionResult> {
  const db = options?.dbInstance;
  const now = options?.now || new Date();

  const access = await getAccessById(accessId, db);
  if (!access) {
    throw new Error(`Akses dengan ID "${accessId}" tidak ditemukan.`);
  }

  // Gunakan transisi stop dari domain logika
  const transResult = transitionOnStop(access.status, access.activeSessionStart, now);

  access.status = transResult.status;
  access.activeSessionStart = undefined;
  await updateAccess(access, db);

  const durationText = transResult.durationSec !== undefined 
    ? `${transResult.durationSec} detik` 
    : 'tanpa catatan waktu mulai';

  const log = await addLog(
    {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accessId: access.id,
      type: 'stop',
      at: now.toISOString(),
      durationSec: transResult.durationSec,
      detail: `Sesi dihentikan (Stop). Durasi: ${durationText}. Status tetap READY.`,
    },
    db
  );

  return {
    access,
    log,
    durationSec: transResult.durationSec,
  };
}

/**
 * 3. Tombol Limit Sesi:
 * - Menyimpan resetAt yang valid (> now) berdasarkan aturan layanan atau input manual.
 * - Mengubah status akses menjadi 'limited'.
 * - Mencatat log 'limit_hit'.
 */
export async function hitLimitSession(
  accessId: string,
  options?: {
    manualResetAt?: string | Date;
    now?: Date;
    dbInstance?: IDBPDatabase;
  }
): Promise<HitLimitResult> {
  const db = options?.dbInstance;
  const now = options?.now || new Date();

  const access = await getAccessById(accessId, db);
  if (!access) {
    throw new Error(`Akses dengan ID "${accessId}" tidak ditemukan.`);
  }

  const service = await getServiceById(access.serviceId, db);
  if (!service) {
    throw new Error(`Layanan (${access.serviceId}) tidak ditemukan.`);
  }

  let targetResetAt: Date;
  if (options?.manualResetAt) {
    targetResetAt = validateManualReset(options.manualResetAt, now);
  } else {
    targetResetAt = computeResetAt(service.resetRule, now);
  }

  const transResult = transitionToLimited(access.status, targetResetAt, now);

  access.status = transResult.status;
  access.limitedAt = transResult.limitedAt;
  access.resetAt = transResult.resetAt;
  access.activeSessionStart = undefined;
  await updateAccess(access, db);

  const log = await addLog(
    {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accessId: access.id,
      type: 'limit_hit',
      at: now.toISOString(),
      detail: `Limit penggunaan tercapai. Menunggu reset pada ${targetResetAt.toISOString()}`,
    },
    db
  );

  return {
    access,
    log,
    resetAt: targetResetAt,
  };
}

/**
 * 4. Edit resetAt saat Limited (BR-05):
 * - Tidak ada tombol "Ready" manual. Koreksi status hanya melalui edit resetAt.
 * - Mengubah resetAt dengan nilai baru yang valid (> now).
 */
export async function editLimitResetAt(
  accessId: string,
  newResetAt: string | Date,
  options?: {
    now?: Date;
    dbInstance?: IDBPDatabase;
  }
): Promise<{ access: Access; log: UsageLog }> {
  const db = options?.dbInstance;
  const now = options?.now || new Date();

  const access = await getAccessById(accessId, db);
  if (!access) {
    throw new Error(`Akses dengan ID "${accessId}" tidak ditemukan.`);
  }

  if (access.status !== 'limited') {
    throw new Error('Koreksi resetAt hanya dapat dilakukan saat status akses adalah LIMITED.');
  }

  const validatedDate = validateManualReset(newResetAt, now);
  access.resetAt = validatedDate.toISOString();
  await updateAccess(access, db);

  const log = await addLog(
    {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accessId: access.id,
      type: 'note',
      at: now.toISOString(),
      detail: `Koreksi waktu resetAt diubah menjadi: ${validatedDate.toISOString()}`,
    },
    db
  );

  return { access, log };
}

/**
 * 5. Evaluasi Auto-Ready (BR-03, BR-06):
 * - Dijalankan saat aplikasi dibuka/refresh dan interval berkala.
 * - Mencatat log 'reset_ready' tepat SEKALI per siklus auto-ready.
 */
export async function processAutoReadyCheck(
  options?: {
    now?: Date;
    dbInstance?: IDBPDatabase;
  }
): Promise<AutoReadyCheckResult> {
  const db = options?.dbInstance;
  const now = options?.now || new Date();

  const allAccesses = await getAllAccess(db);
  const transitionedAccesses: Access[] = [];

  for (const access of allAccesses) {
    if (access.status === 'limited') {
      const evalRes = evaluateAutoReady(access, now);
      if (evalRes.transitionedToReady) {
        access.status = 'ready';
        access.resetAt = undefined;
        access.limitedAt = undefined;
        access.activeSessionStart = undefined;
        await updateAccess(access, db);

        // Catat log reset_ready tepat 1 kali
        await addLog(
          {
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            accessId: access.id,
            type: 'reset_ready',
            at: now.toISOString(),
            detail: 'Otomatis kembali READY karena batas waktu resetAt telah lewat.',
          },
          db
        );

        transitionedAccesses.push(access);
      }
    }
  }

  return {
    transitionedCount: transitionedAccesses.length,
    transitionedAccesses,
  };
}
