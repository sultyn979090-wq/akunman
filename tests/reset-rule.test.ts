/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePacificMidnight,
  calculateDurationReset,
  validateManualReset,
  computeResetAt,
  getPartsInTimezone,
} from '../src/domain/reset-rule';

describe('reset-rule.test', () => {
  it('pacific_midnight_standard', () => {
    // Pada Standard Time (PST, UTC-8):
    // Misal: 15 Januari 2026 jam 18:00:00 UTC (10:00:00 AM PST)
    const nowStandard = new Date(Date.UTC(2026, 0, 15, 18, 0, 0));
    const nextMidnight = calculatePacificMidnight(nowStandard);

    // Di zona Pacific, tengah malam berikutnya adalah 16 Jan 2026 00:00:00 PST = 16 Jan 2026 08:00:00 UTC
    expect(nextMidnight.toISOString()).toBe('2026-01-16T08:00:00.000Z');

    const parts = getPartsInTimezone(nextMidnight);
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(1);
    expect(parts.day).toBe(16);
    expect(parts.hour).toBe(0);
    expect(parts.minute).toBe(0);
    expect(parts.second).toBe(0);
  });

  it('pacific_midnight_dst_boundary', () => {
    // 1. Pada Daylight Saving Time (PDT, UTC-7):
    // Misal: 15 Juli 2026 jam 18:00:00 UTC (11:00:00 AM PDT)
    const nowDaylight = new Date(Date.UTC(2026, 6, 15, 18, 0, 0));
    const nextMidnightDaylight = calculatePacificMidnight(nowDaylight);

    // 00:00:00 PDT = 07:00:00 UTC
    expect(nextMidnightDaylight.toISOString()).toBe('2026-07-16T07:00:00.000Z');

    const partsDaylight = getPartsInTimezone(nextMidnightDaylight);
    expect(partsDaylight.hour).toBe(0);
    expect(partsDaylight.day).toBe(16);

    // 2. Batas Spring Forward DST 2026 (Minggu, 8 Maret 2026):
    // Tanggal 7 Maret 2026 jam 20:00 UTC (12:00 PST) -> Tengah malam 8 Maret 00:00 PST = 08:00 UTC
    const nowSpringEve = new Date(Date.UTC(2026, 2, 7, 20, 0, 0));
    const springMidnight = calculatePacificMidnight(nowSpringEve);
    expect(springMidnight.toISOString()).toBe('2026-03-08T08:00:00.000Z');
    expect(getPartsInTimezone(springMidnight).day).toBe(8);
    expect(getPartsInTimezone(springMidnight).hour).toBe(0);

    // Pada 8 Maret 2026 jam 12:00:00 UTC (05:00 PDT) -> Tengah malam 9 Maret 00:00 PDT = 07:00 UTC
    const nowSpringDay = new Date(Date.UTC(2026, 2, 8, 12, 0, 0));
    const springNextMidnight = calculatePacificMidnight(nowSpringDay);
    expect(springNextMidnight.toISOString()).toBe('2026-03-09T07:00:00.000Z');
    expect(getPartsInTimezone(springNextMidnight).day).toBe(9);
    expect(getPartsInTimezone(springNextMidnight).hour).toBe(0);

    // 3. Batas Fall Back DST 2026 (Minggu, 1 November 2026):
    // Tanggal 31 Oktober 2026 jam 20:00 UTC (13:00 PDT) -> Tengah malam 1 Nov 00:00 PDT = 07:00 UTC
    const nowFallEve = new Date(Date.UTC(2026, 9, 31, 20, 0, 0));
    const fallMidnight = calculatePacificMidnight(nowFallEve);
    expect(fallMidnight.toISOString()).toBe('2026-11-01T07:00:00.000Z');
    expect(getPartsInTimezone(fallMidnight).day).toBe(1);
    expect(getPartsInTimezone(fallMidnight).hour).toBe(0);

    // Tanggal 1 November 2026 jam 12:00 UTC (04:00 PST) -> Tengah malam 2 Nov 00:00 PST = 08:00 UTC
    const nowFallDay = new Date(Date.UTC(2026, 10, 1, 12, 0, 0));
    const fallNextMidnight = calculatePacificMidnight(nowFallDay);
    expect(fallNextMidnight.toISOString()).toBe('2026-11-02T08:00:00.000Z');
    expect(getPartsInTimezone(fallNextMidnight).day).toBe(2);
    expect(getPartsInTimezone(fallNextMidnight).hour).toBe(0);
  });

  it('duration', () => {
    const fixedNow = new Date('2026-10-29T10:00:00.000Z');
    
    // 3 jam kemudian
    const reset3h = calculateDurationReset(fixedNow, 3);
    expect(reset3h.toISOString()).toBe('2026-10-29T13:00:00.000Z');

    // 5 jam kemudian
    const reset5h = calculateDurationReset(fixedNow, 5);
    expect(reset5h.toISOString()).toBe('2026-10-29T15:00:00.000Z');

    // Durasi <= 0 ditolak
    expect(() => calculateDurationReset(fixedNow, 0)).toThrow('lebih besar dari 0 jam');
    expect(() => calculateDurationReset(fixedNow, -2)).toThrow('lebih besar dari 0 jam');

    // Via computeResetAt
    const computed = computeResetAt({ mode: 'duration', hours: 4 }, fixedNow);
    expect(computed.toISOString()).toBe('2026-10-29T14:00:00.000Z');
  });

  it('manual_in_past_rejected', () => {
    const fixedNow = new Date('2026-10-29T10:00:00.000Z');

    // Waktu di masa lalu
    const pastDate = new Date('2026-10-29T09:59:59.000Z');
    expect(() => validateManualReset(pastDate, fixedNow)).toThrow('lebih besar dari waktu sekarang');

    // Waktu persis sama dengan now
    expect(() => validateManualReset(fixedNow, fixedNow)).toThrow('lebih besar dari waktu sekarang');

    // Waktu di masa depan (valid)
    const futureDate = new Date('2026-10-29T12:00:00.000Z');
    const valid = validateManualReset(futureDate, fixedNow);
    expect(valid.toISOString()).toBe('2026-10-29T12:00:00.000Z');

    // Format tidak valid
    expect(() => validateManualReset('bukan-tanggal-valid', fixedNow)).toThrow('tidak valid');
  });
});
