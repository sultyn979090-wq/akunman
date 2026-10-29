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
  getDatabase,
} from '../storage/db';
import { isValidHttpUrl } from '../domain/url-builder';

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

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const isIsoDateString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && !Number.isNaN(Date.parse(v));

const VALID_STATUSES = new Set(['ready', 'limited']);
const VALID_LOG_TYPES = new Set(['opened', 'stop', 'limit_hit', 'reset_ready', 'note']);
const VALID_RESET_MODES = new Set(['pacific_midnight', 'duration', 'manual']);
const VALID_LOGIN_METHODS = new Set(['google', 'own']);

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
  const db = dbInstance || (await getDatabase());
  handoffNotes = await db.getAll('handoffNotes');

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
 * Validasi semantik ketat dan integritas relasional impor JSON lokal (TASK-REV-03)
 */
export function validateImportPayload(
  parsed: unknown,
  maxPersons = 10
): LocalExportPayload {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Format JSON tidak valid atau kosong.');
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error(`Versi skema ekspor/impor ${String(obj.version)} tidak didukung (hanya versi 1).`);
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

  // 1. Validasi batas akun (BR-07, ASM-02)
  if (data.persons.length > maxPersons) {
    throw new Error(`Data impor melanggar batas maksimal ${maxPersons} akun (${data.persons.length} akun ditemukan).`);
  }

  // 2. Validasi semantik entitas Service
  const serviceIds = new Set<string>();
  const serviceNames = new Set<string>();
  for (const s of data.services) {
    if (!isRecord(s) || typeof s.id !== 'string' || !s.id.trim() || typeof s.name !== 'string' || !s.name.trim()) {
      throw new Error('Entitas Service dalam berkas JSON tidak lengkap atau rusak.');
    }
    const trimmedId = s.id.trim();
    if (serviceIds.has(trimmedId)) {
      throw new Error(`Duplikasi ID Service terdeteksi dalam impor: "${trimmedId}".`);
    }
    serviceIds.add(trimmedId);

    const normName = s.name.trim().toLowerCase();
    if (serviceNames.has(normName)) {
      throw new Error(`Duplikasi nama Service terdeteksi dalam impor: "${s.name}".`);
    }
    serviceNames.add(normName);

    if (typeof s.urlTemplate !== 'string' || !isValidHttpUrl(s.urlTemplate)) {
      throw new Error(`Entitas Service "${s.name}" memiliki URL template tidak valid: "${String(s.urlTemplate)}". Wajib menggunakan skema http:// atau https://.`);
    }

    if (!isRecord(s.resetRule) || typeof s.resetRule.mode !== 'string' || !VALID_RESET_MODES.has(s.resetRule.mode)) {
      throw new Error(`Entitas Service "${s.name}" memiliki resetRule yang tidak valid.`);
    }
  }

  // 3. Validasi semantik entitas Person
  const personIds = new Set<string>();
  const owners = new Set<string>();
  const emails = new Set<string>();
  for (const p of data.persons) {
    if (!isRecord(p) || typeof p.id !== 'string' || !p.id.trim() || typeof p.ownerName !== 'string' || !p.ownerName.trim() || typeof p.googleEmail !== 'string' || !p.googleEmail.trim()) {
      throw new Error('Struktur entitas Person dalam berkas JSON tidak lengkap.');
    }
    const trimmedId = p.id.trim();
    if (personIds.has(trimmedId)) {
      throw new Error(`Duplikasi ID Person terdeteksi dalam impor: "${trimmedId}".`);
    }
    personIds.add(trimmedId);

    if (!p.googleEmail.includes('@') || p.googleEmail.trim().length < 5) {
      throw new Error(`Email tidak valid pada entitas Person "${p.ownerName}": "${p.googleEmail}".`);
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

  // 4. Validasi semantik entitas Access & Integritas Relasional (Access -> Person & Service)
  const accessIds = new Set<string>();
  const accessPairs = new Set<string>();
  for (const a of data.access) {
    if (!isRecord(a) || typeof a.id !== 'string' || !a.id.trim()) {
      throw new Error('Entitas Access dalam berkas JSON tidak lengkap atau rusak.');
    }
    const trimmedId = a.id.trim();
    if (accessIds.has(trimmedId)) {
      throw new Error(`Duplikasi ID Access terdeteksi dalam impor: "${trimmedId}".`);
    }
    accessIds.add(trimmedId);

    const personId = typeof a.personId === 'string' ? a.personId.trim() : '';
    const serviceId = typeof a.serviceId === 'string' ? a.serviceId.trim() : '';

    if (!personId || !personIds.has(personId)) {
      throw new Error(`Integritas relasional rusak: Access "${trimmedId}" merujuk personId "${personId}" yang tidak ada dalam daftar akun.`);
    }
    if (!serviceId || !serviceIds.has(serviceId)) {
      throw new Error(`Integritas relasional rusak: Access "${trimmedId}" merujuk serviceId "${serviceId}" yang tidak ada dalam daftar layanan.`);
    }

    const pairKey = `${personId}|${serviceId}`;
    if (accessPairs.has(pairKey)) {
      throw new Error(`Duplikasi relasi (personId, serviceId) terdeteksi untuk person "${personId}" dan service "${serviceId}".`);
    }
    accessPairs.add(pairKey);

    if (typeof a.status !== 'string' || !VALID_STATUSES.has(a.status)) {
      throw new Error(`Status tidak valid pada Access "${trimmedId}": "${String(a.status)}". Harus "ready" atau "limited".`);
    }

    if (a.status === 'limited') {
      if (!isIsoDateString(a.resetAt)) {
        throw new Error(`Access "${trimmedId}" berstatus "limited" tetapi tidak memiliki resetAt bertipe tanggal ISO yang valid.`);
      }
    }

    if (a.loginMethod !== undefined && (typeof a.loginMethod !== 'string' || !VALID_LOGIN_METHODS.has(a.loginMethod))) {
      throw new Error(`loginMethod tidak valid pada Access "${trimmedId}": "${String(a.loginMethod)}".`);
    }
  }

  // 5. Validasi semantik entitas UsageLog & Integritas Relasional (UsageLog -> Access)
  const logIds = new Set<string>();
  for (const l of data.logs) {
    if (!isRecord(l) || typeof l.id !== 'string' || !l.id.trim()) {
      throw new Error('Entitas UsageLog dalam berkas JSON tidak lengkap atau rusak.');
    }
    const trimmedId = l.id.trim();
    if (logIds.has(trimmedId)) {
      throw new Error(`Duplikasi ID UsageLog terdeteksi dalam impor: "${trimmedId}".`);
    }
    logIds.add(trimmedId);

    const accessId = typeof l.accessId === 'string' ? l.accessId.trim() : '';
    if (!accessId || !accessIds.has(accessId)) {
      throw new Error(`Integritas relasional rusak: UsageLog "${trimmedId}" merujuk accessId "${accessId}" yang tidak ada dalam daftar akses.`);
    }

    if (typeof l.type !== 'string' || !VALID_LOG_TYPES.has(l.type)) {
      throw new Error(`Tipe log tidak valid pada UsageLog "${trimmedId}": "${String(l.type)}".`);
    }

    // WAJIB: timestamp `at` harus string ISO yang valid (mencegah crash localeCompare)
    if (!isIsoDateString(l.at)) {
      throw new Error(`Timestamp "at" pada UsageLog "${trimmedId}" harus berupa string ISO 8601 yang valid.`);
    }

    if (l.durationSec !== undefined && (typeof l.durationSec !== 'number' || Number.isNaN(l.durationSec) || l.durationSec < 0)) {
      throw new Error(`durationSec pada UsageLog "${trimmedId}" harus berupa angka non-negatif.`);
    }
  }

  // 6. Validasi semantik entitas HandoffNote & Integritas Relasional (HandoffNote -> Service)
  const handoffIds = new Set<string>();
  for (const h of data.handoffNotes) {
    if (!isRecord(h) || typeof h.id !== 'string' || !h.id.trim()) {
      throw new Error('Entitas HandoffNote dalam berkas JSON tidak lengkap atau rusak.');
    }
    const trimmedId = h.id.trim();
    if (handoffIds.has(trimmedId)) {
      throw new Error(`Duplikasi ID HandoffNote terdeteksi dalam impor: "${trimmedId}".`);
    }
    handoffIds.add(trimmedId);

    const serviceId = typeof h.serviceId === 'string' ? h.serviceId.trim() : '';
    if (!serviceId || !serviceIds.has(serviceId)) {
      throw new Error(`Integritas relasional rusak: HandoffNote "${trimmedId}" merujuk serviceId "${serviceId}" yang tidak ada dalam daftar layanan.`);
    }

    if (typeof h.text !== 'string') {
      throw new Error(`Field "text" pada HandoffNote "${trimmedId}" harus berupa string.`);
    }

    if (!isIsoDateString(h.createdAt)) {
      throw new Error(`Timestamp "createdAt" pada HandoffNote "${trimmedId}" harus berupa string ISO 8601 yang valid.`);
    }
  }

  return parsed as LocalExportPayload;
}

/**
 * Impor data dari string JSON ke IndexedDB:
 * - Menolak berkas rusak / skema salah tanpa mengubah data lokal.
 * - Mempertahankan batas kebijakan lokal (maxPersons) dan kredensial sheetEndpoint & sheetSecret.
 * - Membuat snapshot otomatis sebelum menimpa database.
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

  const db = dbInstance || (await getDatabase());

  // Ambil pengaturan lokal saat ini untuk referensi kebijakan & kredensial
  const currentSettings = await getSettings(db);

  // Validasi ketat skema dengan batas maxPersons lokal
  const payload = validateImportPayload(parsed, currentSettings.maxPersons);

  // Simpan snapshot pengaman pra-impor ke localStorage bila tersedia
  try {
    const preImportSnapshot = await exportLocalJsonData(db);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('ai_account_manager_pre_import_snapshot', preImportSnapshot);
      window.localStorage.setItem(
        'ai_account_manager_pre_import_snapshot_timestamp',
        new Date().toISOString()
      );
    }
  } catch (snapErr) {
    console.warn('Gagal membuat snapshot pre-import:', snapErr);
  }

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

  // Pulihkan settings:
  // - maxPersons TETAP mengacu pada kebijakan lokal currentSettings.maxPersons (mencegah bypass BR-07)
  // - sheetEndpoint & sheetSecret dipertahankan dari lokal (BR-13)
  const importedSettings = payload.data.settings;
  await tx.objectStore('settings').put({
    id: 'default',
    resetTimezone: importedSettings?.resetTimezone || currentSettings.resetTimezone,
    maxPersons: currentSettings.maxPersons,
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
      payload.data.logs.length +
      payload.data.handoffNotes.length,
  };
}
