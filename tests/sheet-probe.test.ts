/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildPingPayload,
  buildBackupPayload,
  buildRestorePayload,
  probeAppsScript,
  backupToSheet,
  restoreFromSheet,
} from '../src/backup/sheet-probe';

describe('TASK-010: Apps Script Probe & Sheet Integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('buildPingPayload memuat action: ping dan secret yang rapi', () => {
    const payloadStr = buildPingPayload('  mySecretKey123  ');
    const parsed = JSON.parse(payloadStr);
    expect(parsed.action).toBe('ping');
    expect(parsed.secret).toBe('mySecretKey123');
    expect(parsed.clientTimestamp).toBeDefined();
  });

  it('buildBackupPayload memuat action: backup dan payload data', () => {
    const dummyData = {
      services: [],
      persons: [],
      access: [],
      logs: [],
      handoffNotes: [],
      settings: { id: 'default', resetTimezone: 'pacific_midnight', maxPersons: 10, updatedAt: '' },
    };
    const payloadStr = buildBackupPayload('key456', dummyData as any);
    const parsed = JSON.parse(payloadStr);
    expect(parsed.action).toBe('backup');
    expect(parsed.secret).toBe('key456');
    expect(parsed.data.settings.id).toBe('default');
  });

  it('probeAppsScript menolak endpoint kosong atau format tidak sesuai', async () => {
    const resEmpty = await probeAppsScript('', 'secret');
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.message).toContain('belum diisi');

    const resInvalid = await probeAppsScript('https://example.com/api', 'secret');
    expect(resInvalid.success).toBe(false);
    expect(resInvalid.message).toContain('https://script.google.com/macros/s/');

    const resNoSecret = await probeAppsScript(
      'https://script.google.com/macros/s/AKfycb.../exec',
      '   '
    );
    expect(resNoSecret.success).toBe(false);
    expect(resNoSecret.message).toContain('Kunci rahasia (Secret Key) belum diisi');
  });

  it('probeAppsScript sukses dengan respons pong dari Apps Script', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Pong! Koneksi Apps Script Web App berhasil terverifikasi.',
        spreadsheetName: 'AI_Account_Manager_Backup',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test123/edit',
      }),
    } as any);

    const res = await probeAppsScript(
      'https://script.google.com/macros/s/TEST_EXEC_ID/exec',
      'correct-secret'
    );

    expect(res.success).toBe(true);
    expect(res.spreadsheetName).toBe('AI_Account_Manager_Backup');
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/TEST_EXEC_ID/exec',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      })
    );
  });

  it('probeAppsScript menangani error 403 (secret salah)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: false,
        error: 'Akses ditolak: Kunci rahasia salah atau tidak disediakan.',
      }),
    } as any);

    const res = await probeAppsScript(
      'https://script.google.com/macros/s/TEST_EXEC_ID/exec',
      'wrong-secret'
    );

    expect(res.success).toBe(false);
    expect(res.message).toContain('Akses ditolak');
  });
});
