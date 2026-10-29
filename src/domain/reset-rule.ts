/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ResetRule } from '../storage/types';

export const PACIFIC_TIMEZONE = 'America/Los_Angeles';

interface TimezoneParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Ekstraksi komponen tanggal & waktu dalam zona waktu tertentu via Intl
 */
export function getPartsInTimezone(date: Date, timeZone = PACIFIC_TIMEZONE): TimezoneParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, number> = {};

  for (const p of parts) {
    if (p.type !== 'literal') {
      partMap[p.type] = parseInt(p.value, 10);
    }
  }

  return {
    year: partMap.year || 1970,
    month: partMap.month || 1,
    day: partMap.day || 1,
    hour: partMap.hour === 24 ? 0 : (partMap.hour || 0),
    minute: partMap.minute || 0,
    second: partMap.second || 0,
  };
}

/**
 * Menghitung waktu 00:00:00 (tengah malam) hari berikutnya di zona waktu Pasifik (America/Los_Angeles).
 * Menangani secara otomatis pergantian Standard Time (PST, UTC-8) dan Daylight Saving Time (PDT, UTC-7),
 * termasuk tanggal batas transisi DST (Maret / November).
 */
export function calculatePacificMidnight(now: Date = new Date(), timeZone = PACIFIC_TIMEZONE): Date {
  const currentParts = getPartsInTimezone(now, timeZone);

  // Tambahkan 1 hari kalender
  // Gunakan UTC noon sebagai jangkar kalender agar terhindar dari offset edge
  const nextDayAnchor = new Date(Date.UTC(currentParts.year, currentParts.month - 1, currentParts.day + 1, 12, 0, 0));
  const nextParts = getPartsInTimezone(nextDayAnchor, timeZone);

  // Zona Pasifik bergeser antara UTC-8 (PST) dan UTC-7 (PDT).
  // 00:00:00 Pasifik pasti berkorespondensi dengan 07:00:00 UTC (PDT) atau 08:00:00 UTC (PST).
  // Uji kandidat jam UTC untuk menemukan exact match 00:00:00 di zona Pasifik.
  for (const candidateUtcHour of [7, 8, 6, 9]) {
    const candidate = new Date(Date.UTC(nextParts.year, nextParts.month - 1, nextParts.day, candidateUtcHour, 0, 0, 0));
    const candParts = getPartsInTimezone(candidate, timeZone);

    if (
      candParts.year === nextParts.year &&
      candParts.month === nextParts.month &&
      candParts.day === nextParts.day &&
      candParts.hour === 0 &&
      candParts.minute === 0 &&
      candParts.second === 0
    ) {
      return candidate;
    }
  }

  // Fallback standar (08:00 UTC) jika tidak ditemukan
  return new Date(Date.UTC(nextParts.year, nextParts.month - 1, nextParts.day, 8, 0, 0, 0));
}

/**
 * Menghitung waktu reset berdasarkan durasi tetap (jam)
 */
export function calculateDurationReset(now: Date = new Date(), hours: number): Date {
  if (hours <= 0) {
    throw new Error('Durasi reset harus lebih besar dari 0 jam.');
  }
  return new Date(now.getTime() + hours * 3600 * 1000);
}

/**
 * Validasi waktu reset manual (harus > waktu sekarang)
 */
export function validateManualReset(manualDate: Date | string, now: Date = new Date()): Date {
  const targetDate = typeof manualDate === 'string' ? new Date(manualDate) : manualDate;
  if (isNaN(targetDate.getTime())) {
    throw new Error('Format waktu reset manual tidak valid.');
  }
  if (targetDate.getTime() <= now.getTime()) {
    throw new Error('Waktu reset manual harus lebih besar dari waktu sekarang.');
  }
  return targetDate;
}

/**
 * Menghitung waktu resetAt berdasarkan aturan layanan yang diberikan
 */
export function computeResetAt(
  rule: ResetRule,
  now: Date = new Date(),
  manualDate?: Date | string
): Date {
  if (rule.mode === 'pacific_midnight') {
    return calculatePacificMidnight(now);
  }
  if (rule.mode === 'duration') {
    return calculateDurationReset(now, rule.hours || 3);
  }
  if (rule.mode === 'manual') {
    if (!manualDate) {
      throw new Error('Waktu reset manual wajib diisi untuk mode manual.');
    }
    return validateManualReset(manualDate, now);
  }
  throw new Error(`Mode reset "${(rule as ResetRule).mode}" tidak dikenal.`);
}
