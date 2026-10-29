/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Access, Person, Service } from '../storage/types';
import { evaluateAutoReady, getRemainingCountdown } from '../domain/access-status';

export interface ServiceDashboardCard {
  service: Service;
  totalAccounts: number;
  readyAccountsCount: number;
  limitedAccountsCount: number;
  suggestedAccount: {
    person: Person;
    access: Access;
    reason: string;
  } | null;
  accounts: Array<{
    person: Person;
    access: Access;
    countdown: string;
    isReady: boolean;
  }>;
}

/**
 * Menghitung jumlah akses yang berubah menjadi Ready sejak aplikasi terakhir dibuka / refresh (BR-06)
 * Tanpa menggunakan notifikasi push background.
 */
export function getReadyCountSinceLastOpen(
  accesses: Access[],
  lastOpenTimestamp?: string | null,
  now: Date = new Date()
): { count: number; readyAccesses: Access[] } {
  if (!lastOpenTimestamp) {
    // Pembukaan pertama kali: hitung semua akses yang ready
    const readyList = accesses.filter((a) => a.status === 'ready');
    return { count: readyList.length, readyAccesses: readyList };
  }

  const lastOpenTime = new Date(lastOpenTimestamp).getTime();
  const readyList = accesses.filter((a) => {
    // Akses yang berstatus ready dan waktu resetAt-nya terjadi antara lastOpenTime dan now
    if (a.status === 'ready' && a.resetAt) {
      const resetTime = new Date(a.resetAt).getTime();
      return resetTime >= lastOpenTime && resetTime <= now.getTime();
    }
    // Atau yang baru dievaluasi auto-ready
    const evalRes = evaluateAutoReady(a, now);
    return evalRes.transitionedToReady;
  });

  return {
    count: readyList.length,
    readyAccesses: readyList,
  };
}

/**
 * Saran akun ready berikutnya untuk layanan tertentu (BR-11, BR-15)
 * Memprioritaskan akun berstatus 'ready' yang bukan akun aktif saat ini.
 */
export function getNextReadyAccountSuggestion(
  serviceId: string,
  currentPersonId: string | null,
  accesses: Access[],
  persons: Person[],
  now: Date = new Date()
): { suggestedAccess: Access | null; suggestedPerson: Person | null; reason: string } {
  const serviceAccesses = accesses.filter((a) => a.serviceId === serviceId);

  // Evaluasi auto-ready
  const readyCandidates = serviceAccesses.filter((a) => {
    const evalRes = evaluateAutoReady(a, now);
    return evalRes.isReady;
  });

  if (readyCandidates.length === 0) {
    // Cari yang waktu reset-nya paling cepat
    const limitedList = serviceAccesses
      .filter((a) => a.status === 'limited' && a.resetAt)
      .sort((a, b) => new Date(a.resetAt!).getTime() - new Date(b.resetAt!).getTime());

    if (limitedList.length > 0) {
      const nextCandidate = limitedList[0];
      const person = persons.find((p) => p.id === nextCandidate.personId) || null;
      const cd = getRemainingCountdown(nextCandidate.resetAt, now);
      return {
        suggestedAccess: nextCandidate,
        suggestedPerson: person,
        reason: `Semua akun sedang limited. Akun ini reset paling cepat (${cd.formatted}).`,
      };
    }

    return {
      suggestedAccess: null,
      suggestedPerson: null,
      reason: 'Belum ada akun yang terhubung ke layanan ini.',
    };
  }

  // Pilih akun ready selain akun saat ini
  let selected = readyCandidates.find((a) => a.personId !== currentPersonId);
  if (!selected) {
    selected = readyCandidates[0]; // fallback jika hanya ada 1 akun
  }

  const person = persons.find((p) => p.id === selected.personId) || null;

  return {
    suggestedAccess: selected,
    suggestedPerson: person,
    reason: selected.personId === currentPersonId
      ? 'Akun aktif saat ini siap digunakan.'
      : 'Akun ini berstatus READY dan siap untuk switch cepat.',
  };
}
