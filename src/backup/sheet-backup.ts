/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IDBPDatabase } from 'idb';
import {
  exportLocalJsonData,
  importLocalJsonData,
  validateImportPayload,
  type LocalExportPayload,
} from './json-backup';
import {
  backupToSheet,
  restoreFromSheet,
  type SheetBackupResult,
  type SheetRestoreResult,
} from './sheet-probe';

export const PRE_RESTORE_STORAGE_KEY = 'ai_account_manager_pre_restore_snapshot';

export interface EntityCounts {
  services: number;
  persons: number;
  access: number;
  logs: number;
  handoffNotes: number;
  total: number;
}

export function countEntities(data: {
  services?: any[];
  persons?: any[];
  access?: any[];
  logs?: any[];
  handoffNotes?: any[];
}): EntityCounts {
  const services = Array.isArray(data?.services) ? data.services.length : 0;
  const persons = Array.isArray(data?.persons) ? data.persons.length : 0;
  const access = Array.isArray(data?.access) ? data.access.length : 0;
  const logs = Array.isArray(data?.logs) ? data.logs.length : 0;
  const handoffNotes = Array.isArray(data?.handoffNotes) ? data.handoffNotes.length : 0;
  return {
    services,
    persons,
    access,
    logs,
    handoffNotes,
    total: services + persons + access + logs + handoffNotes,
  };
}

class InMemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const memoryStorageFallback = new InMemoryStorage();

export interface ExecuteSheetRestoreOptions {
  confirmOverwrite?: (counts: { remote: EntityCounts; local: EntityCounts }) => boolean | Promise<boolean>;
  onPreRestoreBackup?: (backupJson: string) => void | Promise<void>;
  storage?: Storage;
}

export interface SheetOperationOutcome {
  success: boolean;
  message: string;
  timestamp?: string;
  snapshotCreated?: boolean;
}

/**
 * Eksekusi Backup ke Google Sheets (PWA -> Sheet):
 * - Membaca data lokal lewat exportLocalJsonData (BR-10, BR-13; rahasia tidak ikut).
 * - Mengirim payload ke Apps Script Web App.
 * - Endpoint dan kunci rahasia TIDAK pernah dikirim ke tab Sheet maupun ekspor JSON.
 */
export async function executeSheetBackup(
  endpoint: string,
  secret: string,
  dbInstance?: IDBPDatabase
): Promise<SheetOperationOutcome> {
  const cleanEndpoint = endpoint.trim();
  const cleanSecret = secret.trim();

  if (!cleanEndpoint || !cleanSecret) {
    return {
      success: false,
      message: 'Endpoint URL dan Kunci Rahasia diperlukan untuk pencadangan.',
    };
  }

  try {
    const localJsonString = await exportLocalJsonData(dbInstance);
    const parsedPayload: LocalExportPayload = JSON.parse(localJsonString);

    const result: SheetBackupResult = await backupToSheet(
      cleanEndpoint,
      cleanSecret,
      parsedPayload.data
    );

    return {
      success: result.success,
      message: result.message,
      timestamp: result.backupTimestamp,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Eksekusi Restore dari Google Sheets (Sheet -> PWA):
 * - Mengambil data Sheet terlebih dahulu dari Apps Script Web App.
 * - Memvalidasi format & integritas skema (jika salah skema, DITOLAK tanpa ubah data lokal).
 * - Menghitung perbandingan entitas (remote vs local).
 * - Proteksi Sheet Kosong (AC-2): jika remote 0 entitas dan lokal > 0, DITOLAK.
 * - Konfirmasi pengguna dengan informasi perbandingan jumlah entitas (AC-3).
 * - Fail-Closed Snapshot (AC-1): salinan lokal WAJIB tersimpan sebelum menimpa. Jika gagal, abort.
 * - Menimpa IndexedDB lokal dan mempertahankan kredensial lokal (AC-1, BR-13).
 */
export async function executeSheetRestore(
  endpoint: string,
  secret: string,
  options?: ExecuteSheetRestoreOptions,
  dbInstance?: IDBPDatabase
): Promise<SheetOperationOutcome> {
  const cleanEndpoint = endpoint.trim();
  const cleanSecret = secret.trim();

  if (!cleanEndpoint || !cleanSecret) {
    return {
      success: false,
      message: 'Endpoint URL dan Kunci Rahasia diperlukan untuk pemulihan.',
    };
  }

  // 1. Ambil data dari Apps Script Web App
  const sheetResult: SheetRestoreResult = await restoreFromSheet(
    cleanEndpoint,
    cleanSecret
  );

  if (!sheetResult.success || !sheetResult.data) {
    return {
      success: false,
      message: sheetResult.message || 'Gagal mengambil data dari Google Sheets.',
    };
  }

  // 2. Validasi ketat integritas skema data Sheet (AC-3)
  const syntheticPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: sheetResult.data,
  };

  try {
    validateImportPayload(syntheticPayload);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Struktur data Sheet rusak.';
    return {
      success: false,
      message: `Pemulihan dibatalkan: Data Sheet tidak valid atau rusak (${errorMsg}). Data lokal tidak diubah.`,
    };
  }

  // 3. Baca data lokal untuk menghitung perbandingan entitas & persiapan snapshot
  let localJsonString: string;
  try {
    localJsonString = await exportLocalJsonData(dbInstance);
  } catch (exportErr) {
    return {
      success: false,
      message: `Restore dibatalkan: gagal membaca data lokal (${exportErr instanceof Error ? exportErr.message : String(exportErr)}). Data lokal tidak diubah.`,
    };
  }

  const localParsed = JSON.parse(localJsonString);
  const localCounts = countEntities(localParsed.data || {});
  const remoteCounts = countEntities(sheetResult.data);

  // 4. Proteksi Sheet Kosong (AC-2)
  if (remoteCounts.total === 0 && localCounts.total > 0) {
    return {
      success: false,
      message: `Restore dibatalkan: Sheet kosong (0 entitas) sedangkan data lokal berisi ${localCounts.total} entitas. Data lokal tidak diubah.`,
    };
  }

  // 5. Konfirmasi sebelum melanjutkan dengan perbandingan jumlah data (AC-3)
  if (options?.confirmOverwrite) {
    const isConfirmed = await options.confirmOverwrite({
      remote: remoteCounts,
      local: localCounts,
    });
    if (!isConfirmed) {
      return {
        success: false,
        message: 'Pemulihan data dibatalkan oleh pengguna.',
      };
    }
  }

  // 6. Fail-Closed Salinan Lokal Otomatis SEBELUM menimpa data lokal (AC-1, BR-12)
  let snapshotSaved = false;
  try {
    const store =
      options?.storage ||
      (typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : memoryStorageFallback);

    if (store) {
      store.setItem(PRE_RESTORE_STORAGE_KEY, localJsonString);
      store.setItem(
        `${PRE_RESTORE_STORAGE_KEY}_timestamp`,
        new Date().toISOString()
      );
      snapshotSaved = true;
    }

    if (options?.onPreRestoreBackup) {
      await options.onPreRestoreBackup(localJsonString);
      snapshotSaved = true;
    }
  } catch (snapshotErr) {
    snapshotSaved = false;
  }

  // AC-1 Fail-Closed: Jika snapshot gagal dibuat (misal storage quota full), batalkan pemulihan
  if (!snapshotSaved) {
    return {
      success: false,
      message: 'Restore dibatalkan: salinan pengaman gagal dibuat. Data lokal tidak diubah.',
      snapshotCreated: false,
    };
  }

  // 7. Impor data ke penyimpanan lokal IndexedDB
  try {
    await importLocalJsonData(JSON.stringify(syntheticPayload), dbInstance);

    return {
      success: true,
      message: 'Data berhasil dipulihkan dari Google Sheets ke penyimpanan lokal!',
      timestamp: new Date().toISOString(),
      snapshotCreated: snapshotSaved,
    };
  } catch (importErr: unknown) {
    return {
      success: false,
      message: `Gagal menulis data ke IndexedDB: ${importErr instanceof Error ? importErr.message : String(importErr)}`,
    };
  }
}
