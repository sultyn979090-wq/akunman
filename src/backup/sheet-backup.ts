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

export interface ExecuteSheetRestoreOptions {
  confirmOverwrite?: () => boolean | Promise<boolean>;
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
 * - Meminta konfirmasi (jika disediakan callback confirmOverwrite).
 * - Menghubungi Apps Script untuk membaca data.
 * - Memvalidasi format & integritas data Sheet: jika rusak/salah skema, DITOLAK tanpa mengubah data lokal (AC-3).
 * - Sebelum menimpa data, OTOMATIS membuat salinan JSON lokal (AC-2, BR-12) dan menyimpannya.
 * - Menimpa IndexedDB lokal dan mempertahankan kredensial endpoint/secret lokal (AC-1, BR-13).
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

  // 1. Konfirmasi sebelum melanjutkan
  if (options?.confirmOverwrite) {
    const isConfirmed = await options.confirmOverwrite();
    if (!isConfirmed) {
      return {
        success: false,
        message: 'Pemulihan data dibatalkan oleh pengguna.',
      };
    }
  }

  // 2. Ambil data dari Apps Script Web App
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

  // 3. Validasi ketat integritas skema data Sheet (AC-3)
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

  // 4. Buat salinan lokal otomatis SEBELUM menimpa data lokal (AC-2, BR-12)
  let snapshotSaved = false;
  try {
    const preRestoreSnapshot = await exportLocalJsonData(dbInstance);

    // Simpan ke storage (localStorage)
    const store = options?.storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (store) {
      store.setItem(PRE_RESTORE_STORAGE_KEY, preRestoreSnapshot);
      store.setItem(
        `${PRE_RESTORE_STORAGE_KEY}_timestamp`,
        new Date().toISOString()
      );
      snapshotSaved = true;
    }

    // Panggil hook eksternal jika ada (mis. untuk trigger download cadangan)
    if (options?.onPreRestoreBackup) {
      await options.onPreRestoreBackup(preRestoreSnapshot);
      snapshotSaved = true;
    }
  } catch (snapshotErr) {
    console.warn('Gagal membuat auto-snapshot pre-restore:', snapshotErr);
  }

  // 5. Impor data ke penyimpanan lokal IndexedDB (AC-1)
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
