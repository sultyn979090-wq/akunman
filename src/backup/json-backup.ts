/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IDBPDatabase } from 'idb';
import type {
  Service,
  Person,
  Access,
  UsageLog,
  HandoffNote,
  Settings,
} from '../storage/types';
import {
  getAllServices,
  getAllPersons,
  getAllAccess,
  getAllLogs,
  getSettings,
  saveSettings,
} from '../storage/db';

export interface LocalExportPayload {
  version: number;
  exportedAt: string;
  data: {
    services: Service[];
    persons: Person[];
    access: Access[];
    logs: UsageLog[];
    handoffNotes: HandoffNote[];
    settings: Omit<Settings, 'sheetEndpoint' | 'sheetSecret'>;
  };
}

/**
 * Ekspor seluruh data lokal ke string JSON (BR-10, BR-13):
 * - sheetEndpoint dan sheetSecret DIKECUALIKAN / DIHAPUS (rahasia tidak ikut diekspor).
 */
export async function exportLocalJsonData(
  dbInstance?: IDBPDatabase
): Promise<string> {
  const [services, persons, access, logs, settings] = await Promise.all([
    getAllServices(dbInstance),
    getAllPersons(dbInstance),
    getAllAccess(dbInstance),
    getAllLogs(dbInstance),
    getSettings(dbInstance),
  ]);

  // Ambil semua handoff notes
  let handoffNotes: HandoffNote[] = [];
  if (dbInstance) {
    handoffNotes = await dbInstance.getAll('handoffNotes');
  } else {
    const { getDatabase } = await import('../storage/db');
    const db = await getDatabase();
    handoffNotes = await db.getAll('handoffNotes');
  }

  // Bersihkan rahasia dari settings (BR-13)
  const safeSettings: Omit<Settings, 'sheetEndpoint' | 'sheetSecret'> = {
    id: settings.id,
    resetTimezone: settings.resetTimezone,
    maxPersons: settings.maxPersons,
    updatedAt: settings.updatedAt,
  };

  const payload: LocalExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      services,
      persons,
      access,
      logs,
      handoffNotes,
      settings: safeSettings,
    },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Validasi skema impor JSON lokal
 */
export function validateImportPayload(parsed: unknown): LocalExportPayload {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Format JSON tidak valid atau kosong.');
  }

  const obj = parsed as Record<string, unknown>;
  if (!obj.version || typeof obj.version !== 'number') {
    throw new Error('Versi skema ekspor/impor tidak ditemukan atau tidak valid.');
  }

  const data = obj.data as Record<string, unknown>;
  if (!data || typeof data !== 'object') {
    throw new Error('Bagian "data" pada berkas JSON tidak ditemukan.');
  }

  if (
    !Array.isArray(data.services) ||
    !Array.isArray(data.persons) ||
    !Array.isArray(data.access) ||
    !Array.isArray(data.logs) ||
    !Array.isArray(data.handoffNotes)
  ) {
    throw new Error('Skema JSON rusak: entitas services, persons, access, logs, atau handoffNotes bukan array.');
  }

  // Validasi constraint dasar
  if (data.persons.length > 10) {
    throw new Error(`Data impor melanggar batas maksimal 10 akun (${data.persons.length} akun ditemukan).`);
  }

  // Periksa duplikasi ownerName & googleEmail dalam payload
  const owners = new Set<string>();
  const emails = new Set<string>();
  for (const p of data.persons as Person[]) {
    if (!p.id || !p.ownerName || !p.googleEmail) {
      throw new Error('Struktur entitas Person dalam berkas JSON tidak lengkap.');
    }
    const normOwner = p.ownerName.trim().toLowerCase();
    const normEmail = p.googleEmail.trim().toLowerCase();
    if (owners.has(normOwner)) {
      throw new Error(`Duplikasi ownerName terdeteksi dalam impor: "${p.ownerName}".`);
    }
    if (emails.has(normEmail)) {
      throw new Error(`Duplikasi googleEmail terdeteksi dalam impor: "${p.googleEmail}".`);
    }
    owners.add(normOwner);
    emails.add(normEmail);
  }

  return parsed as LocalExportPayload;
}

/**
 * Impor data dari string JSON ke IndexedDB:
 * - Menolak berkas rusak / skema salah tanpa mengubah data lokal.
 * - Mempertahankan kredensial sheetEndpoint & sheetSecret lokal yang sudah tersimpan sebelumnya.
 */
export async function importLocalJsonData(
  jsonString: string,
  dbInstance?: IDBPDatabase
): Promise<{ success: boolean; importedCount: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Gagal membaca berkas: Format JSON tidak valid atau rusak sintaks.');
  }

  // Validasi ketat skema
  const payload = validateImportPayload(parsed);

  const { getDatabase } = await import('../storage/db');
  const db = dbInstance || (await getDatabase());

  // Simpan kredensial settings lokal yang ada agar tidak hilang
  const currentSettings = await getSettings(db);

  const tx = db.transaction(
    ['services', 'persons', 'access', 'logs', 'handoffNotes', 'settings'],
    'readwrite'
  );

  // Bersihkan data lama
  await tx.objectStore('services').clear();
  await tx.objectStore('persons').clear();
  await tx.objectStore('access').clear();
  await tx.objectStore('logs').clear();
  await tx.objectStore('handoffNotes').clear();

  // Masukkan data baru
  for (const s of payload.data.services) {
    await tx.objectStore('services').put(s);
  }
  for (const p of payload.data.persons) {
    await tx.objectStore('persons').put(p);
  }
  for (const a of payload.data.access) {
    await tx.objectStore('access').put(a);
  }
  for (const l of payload.data.logs) {
    await tx.objectStore('logs').put(l);
  }
  for (const h of payload.data.handoffNotes) {
    await tx.objectStore('handoffNotes').put(h);
  }

  // Pulihkan settings dengan mempertahankan endpoint & secret lokal
  const importedSettings = payload.data.settings;
  await tx.objectStore('settings').put({
    id: 'default',
    resetTimezone: importedSettings?.resetTimezone || currentSettings.resetTimezone,
    maxPersons: importedSettings?.maxPersons || currentSettings.maxPersons,
    sheetEndpoint: currentSettings.sheetEndpoint, // pertahankan lokal
    sheetSecret: currentSettings.sheetSecret,     // pertahankan lokal
    updatedAt: new Date().toISOString(),
  });

  await tx.done;

  return {
    success: true,
    importedCount:
      payload.data.services.length +
      payload.data.persons.length +
      payload.data.access.length +
      payload.data.logs.length,
  };
}
