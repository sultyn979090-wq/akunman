/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Access, AccessStatus } from '../storage/types';

export interface TransitionLimitResult {
  status: 'limited';
  limitedAt: string;
  resetAt: string;
}

export interface TransitionStopResult {
  status: 'ready';
  durationSec?: number;
}

export interface AutoReadyResult {
  status: AccessStatus;
  isReady: boolean;
  transitionedToReady: boolean;
}

export interface CountdownResult {
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  formatted: string;
}

/**
 * Transisi status ke 'limited' (Pemicu: tombol Limit atau edit resetAt)
 * Guard: resetAt harus > now.
 * Valid dari: 'ready' (Limit pertama) atau 'limited' (Koreksi/Edit resetAt).
 */
export function transitionToLimited(
  currentStatus: AccessStatus,
  resetAt: Date | string,
  now: Date = new Date()
): TransitionLimitResult {
  const targetDate = typeof resetAt === 'string' ? new Date(resetAt) : resetAt;

  if (isNaN(targetDate.getTime())) {
    throw new Error('Format waktu reset tidak valid.');
  }

  if (targetDate.getTime() <= now.getTime()) {
    throw new Error('Waktu reset harus lebih besar dari waktu sekarang.');
  }

  if (currentStatus !== 'ready' && currentStatus !== 'limited') {
    throw new Error(`Transisi ilegal: status awal "${currentStatus}" tidak valid.`);
  }

  return {
    status: 'limited',
    limitedAt: now.toISOString(),
    resetAt: targetDate.toISOString(),
  };
}

/**
 * Transisi status saat sesi dihentikan (Pemicu: tombol Stop)
 * Guard: Status harus 'ready'. Status tetap 'ready'.
 * Durasi dicatat bila activeSessionStart ada.
 */
export function transitionOnStop(
  currentStatus: AccessStatus,
  activeSessionStart?: string | null,
  now: Date = new Date()
): TransitionStopResult {
  if (currentStatus === 'limited') {
    throw new Error('Transisi ilegal: Tombol Stop tidak dapat digunakan saat status limited.');
  }

  if (currentStatus !== 'ready') {
    throw new Error(`Transisi ilegal: status awal "${currentStatus}" tidak valid.`);
  }

  let durationSec: number | undefined;
  if (activeSessionStart) {
    const startTime = new Date(activeSessionStart).getTime();
    if (!isNaN(startTime) && startTime <= now.getTime()) {
      durationSec = Math.floor((now.getTime() - startTime) / 1000);
    }
  }

  return {
    status: 'ready',
    durationSec,
  };
}

/**
 * Evaluasi status auto-Ready (BR-03, BR-05):
 * - Otomatis menjadi 'ready' bila now >= resetAt.
 * - Tetap 'limited' bila now < resetAt.
 * - Tanpa tombol Ready manual (koreksi dilakukan dengan mengedit resetAt).
 */
export function evaluateAutoReady(
  access: Pick<Access, 'status' | 'resetAt'>,
  now: Date = new Date()
): AutoReadyResult {
  if (access.status !== 'limited') {
    return {
      status: 'ready',
      isReady: true,
      transitionedToReady: false,
    };
  }

  if (!access.resetAt) {
    return {
      status: 'limited',
      isReady: false,
      transitionedToReady: false,
    };
  }

  const resetTime = new Date(access.resetAt).getTime();
  if (isNaN(resetTime)) {
    return {
      status: 'limited',
      isReady: false,
      transitionedToReady: false,
    };
  }

  if (now.getTime() >= resetTime) {
    return {
      status: 'ready',
      isReady: true,
      transitionedToReady: true,
    };
  }

  return {
    status: 'limited',
    isReady: false,
    transitionedToReady: false,
  };
}

/**
 * Menolak transisi ilegal langsung ke ready tanpa lewat auto-ready atau now >= resetAt
 */
export function assertLegalTransition(from: AccessStatus, to: AccessStatus, resetAt?: string, now: Date = new Date()): void {
  if (from === 'limited' && to === 'ready') {
    if (!resetAt || new Date(resetAt).getTime() > now.getTime()) {
      throw new Error('Transisi ilegal: Tidak ada tombol Ready manual. Status hanya dapat menjadi ready secara otomatis jika waktu sekarang >= resetAt.');
    }
  }
}

/**
 * Menghitung sisa waktu hitung mundur menuju resetAt
 */
export function getRemainingCountdown(resetAt?: string | null, now: Date = new Date()): CountdownResult {
  if (!resetAt) {
    return { hours: 0, minutes: 0, seconds: 0, isPast: true, formatted: '00:00:00' };
  }

  const target = new Date(resetAt).getTime();
  const diffMs = target - now.getTime();

  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isPast: true, formatted: '00:00:00' };
  }

  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { hours, minutes, seconds, isPast: false, formatted };
}
