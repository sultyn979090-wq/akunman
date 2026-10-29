/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  transitionToLimited,
  transitionOnStop,
  evaluateAutoReady,
  assertLegalTransition,
  getRemainingCountdown,
} from '../src/domain/access-status';

describe('access-status.test', () => {
  const baseNow = new Date('2026-10-29T10:00:00.000Z');
  const futureReset = new Date('2026-10-29T14:00:00.000Z');

  it('limited_stays_before_reset', () => {
    // Transisi ke limited
    const limitResult = transitionToLimited('ready', futureReset, baseNow);
    expect(limitResult.status).toBe('limited');
    expect(limitResult.resetAt).toBe('2026-10-29T14:00:00.000Z');

    // 1 jam sebelum reset (now: 13:00 UTC)
    const beforeResetTime = new Date('2026-10-29T13:00:00.000Z');
    const evalBefore = evaluateAutoReady(
      { status: 'limited', resetAt: futureReset.toISOString() },
      beforeResetTime
    );
    expect(evalBefore.status).toBe('limited');
    expect(evalBefore.isReady).toBe(false);
    expect(evalBefore.transitionedToReady).toBe(false);

    // Countdown 1 jam tersisa
    const countdown = getRemainingCountdown(futureReset.toISOString(), beforeResetTime);
    expect(countdown.isPast).toBe(false);
    expect(countdown.hours).toBe(1);
    expect(countdown.minutes).toBe(0);
    expect(countdown.seconds).toBe(0);
    expect(countdown.formatted).toBe('01:00:00');
  });

  it('auto_ready_after_reset', () => {
    // Tepat pada waktu reset (now: 14:00 UTC)
    const exactResetTime = new Date('2026-10-29T14:00:00.000Z');
    const evalExact = evaluateAutoReady(
      { status: 'limited', resetAt: futureReset.toISOString() },
      exactResetTime
    );
    expect(evalExact.status).toBe('ready');
    expect(evalExact.isReady).toBe(true);
    expect(evalExact.transitionedToReady).toBe(true);

    // 15 menit setelah waktu reset (now: 14:15 UTC)
    const afterResetTime = new Date('2026-10-29T14:15:00.000Z');
    const evalAfter = evaluateAutoReady(
      { status: 'limited', resetAt: futureReset.toISOString() },
      afterResetTime
    );
    expect(evalAfter.status).toBe('ready');
    expect(evalAfter.isReady).toBe(true);
    expect(evalAfter.transitionedToReady).toBe(true);

    // Countdown sudah expired
    const countdown = getRemainingCountdown(futureReset.toISOString(), afterResetTime);
    expect(countdown.isPast).toBe(true);
    expect(countdown.formatted).toBe('00:00:00');
  });

  it('illegal_transition_rejected', () => {
    // 1. Mencoba limit dengan waktu reset di masa lalu
    const pastReset = new Date('2026-10-29T09:00:00.000Z');
    expect(() => transitionToLimited('ready', pastReset, baseNow)).toThrow('lebih besar dari waktu sekarang');

    // 2. Mencoba Stop saat status limited (BR-05)
    expect(() => transitionOnStop('limited', null, baseNow)).toThrow(/tidak dapat digunakan saat status limited/);

    // 3. Stop valid saat status ready dan menghitung durasi sesi
    const sessionStart = new Date('2026-10-29T09:30:00.000Z').toISOString();
    const stopResult = transitionOnStop('ready', sessionStart, baseNow);
    expect(stopResult.status).toBe('ready');
    expect(stopResult.durationSec).toBe(1800); // 30 menit = 1800 detik

    // 4. Mencoba transisi langsung manual dari limited ke ready saat resetAt belum lewat
    expect(() =>
      assertLegalTransition('limited', 'ready', futureReset.toISOString(), baseNow)
    ).toThrow(/Tidak ada tombol Ready manual/);

    // 5. Transisi legal saat resetAt sudah lewat
    const pastResetTime = new Date('2026-10-29T15:00:00.000Z');
    expect(() =>
      assertLegalTransition('limited', 'ready', futureReset.toISOString(), pastResetTime)
    ).not.toThrow();
  });
});
