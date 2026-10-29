/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LocalExportPayload } from './json-backup';

export interface ProbeResult {
  success: boolean;
  latencyMs: number;
  message: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  rawError?: string;
}

export interface SheetBackupResult {
  success: boolean;
  message: string;
  backupTimestamp?: string;
}

export interface SheetRestoreResult {
  success: boolean;
  message: string;
  data?: LocalExportPayload['data'];
}

/**
 * Membentuk payload ping untuk pengujian Apps Script
 */
export function buildPingPayload(secret: string): string {
  return JSON.stringify({
    action: 'ping',
    secret: secret.trim(),
    clientTimestamp: new Date().toISOString(),
  });
}

/**
 * Membentuk payload backup untuk Apps Script
 */
export function buildBackupPayload(secret: string, data: LocalExportPayload['data']): string {
  return JSON.stringify({
    action: 'backup',
    secret: secret.trim(),
    data,
  });
}

/**
 * Membentuk payload restore untuk Apps Script
 */
export function buildRestorePayload(secret: string): string {
  return JSON.stringify({
    action: 'restore',
    secret: secret.trim(),
  });
}

/**
 * Uji koneksi (probe) ke Google Apps Script Web App Endpoint.
 *
 * Catatan Arsitektur CORS (TASK-010):
 * Browser Web Apps Script memerlukan Content-Type: text/plain untuk melewati
 * preflight OPTIONS CORS issue, dan Apps Script doPost membaca e.postData.contents.
 */
export async function probeAppsScript(
  endpoint: string,
  secret: string
): Promise<ProbeResult> {
  const cleanEndpoint = endpoint.trim();
  const cleanSecret = secret.trim();

  if (!cleanEndpoint) {
    return {
      success: false,
      latencyMs: 0,
      message: 'URL Endpoint Apps Script belum diisi.',
    };
  }

  if (!cleanEndpoint.startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      latencyMs: 0,
      message: 'Format URL salah. Harus diawali dengan https://script.google.com/macros/s/ dan berakhiran /exec.',
    };
  }

  if (!cleanSecret) {
    return {
      success: false,
      latencyMs: 0,
      message: 'Kunci rahasia (Secret Key) belum diisi.',
    };
  }

  const startTime = Date.now();
  try {
    const payload = buildPingPayload(cleanSecret);
    const response = await fetch(cleanEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        latencyMs,
        message: `HTTP Error: ${response.status} ${response.statusText}`,
      };
    }

    const json = await response.json();
    if (json.success) {
      return {
        success: true,
        latencyMs,
        message: json.message || 'Koneksi ke Apps Script & Spreadsheet berhasil!',
        spreadsheetName: json.spreadsheetName,
        spreadsheetUrl: json.spreadsheetUrl,
      };
    } else {
      return {
        success: false,
        latencyMs,
        message: json.error || 'Server menolak permintaan probe.',
      };
    }
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      latencyMs,
      message: `Gagal menghubungi endpoint: ${errorMsg}. Pastikan Web App di-deploy dengan akses "Anyone".`,
      rawError: errorMsg,
    };
  }
}

/**
 * Mengirim data cadangan ke Google Sheets via Apps Script Web App
 */
export async function backupToSheet(
  endpoint: string,
  secret: string,
  data: LocalExportPayload['data']
): Promise<SheetBackupResult> {
  const cleanEndpoint = endpoint.trim();
  const cleanSecret = secret.trim();

  if (!cleanEndpoint || !cleanSecret) {
    return {
      success: false,
      message: 'Endpoint dan secret key diperlukan.',
    };
  }

  try {
    const payload = buildBackupPayload(cleanSecret, data);
    const response = await fetch(cleanEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const resJson = await response.json();
    return {
      success: Boolean(resJson.success),
      message: resJson.message || resJson.error || 'Operasi selesai.',
      backupTimestamp: resJson.backupTimestamp,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Mengambil data dari Google Sheets via Apps Script Web App
 */
export async function restoreFromSheet(
  endpoint: string,
  secret: string
): Promise<SheetRestoreResult> {
  const cleanEndpoint = endpoint.trim();
  const cleanSecret = secret.trim();

  if (!cleanEndpoint || !cleanSecret) {
    return {
      success: false,
      message: 'Endpoint dan secret key diperlukan.',
    };
  }

  try {
    const payload = buildRestorePayload(cleanSecret);
    const response = await fetch(cleanEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const resJson = await response.json();
    if (resJson.success && resJson.data) {
      return {
        success: true,
        message: resJson.message || 'Data berhasil dipulihkan dari Google Sheets.',
        data: resJson.data,
      };
    }

    return {
      success: false,
      message: resJson.error || 'Format data pemulihan tidak valid.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
