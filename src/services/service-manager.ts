/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IDBPDatabase } from 'idb';
import type { Service, ResetRule } from '../storage/types';
import {
  getAllServices,
  createService as storageCreateService,
  updateService as storageUpdateService,
  deleteService as storageDeleteService,
  getServiceById as storageGetServiceById,
} from '../storage/db';
import { isValidHttpUrl } from '../domain/url-builder';

/**
 * Daftar seed awal layanan AI yang telah disetujui (BR-02, BR-08, ASM-09)
 */
export const DEFAULT_AI_SERVICES: Omit<Service, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'srv-aistudio',
    name: 'Google AI Studio',
    urlTemplate: 'https://aistudio.google.com',
    usesAuthuser: true,
    resetRule: { mode: 'pacific_midnight' },
  },
  {
    id: 'srv-claude',
    name: 'Anthropic Claude',
    urlTemplate: 'https://claude.ai',
    usesAuthuser: false,
    resetRule: { mode: 'duration', hours: 5 },
  },
  {
    id: 'srv-chatgpt',
    name: 'OpenAI ChatGPT',
    urlTemplate: 'https://chatgpt.com',
    usesAuthuser: false,
    resetRule: { mode: 'duration', hours: 3 },
  },
  {
    id: 'srv-deepseek',
    name: 'DeepSeek',
    urlTemplate: 'https://chat.deepseek.com',
    usesAuthuser: false,
    resetRule: { mode: 'duration', hours: 3 },
  },
  {
    id: 'srv-x',
    name: 'X (Twitter)',
    urlTemplate: 'https://x.com',
    usesAuthuser: false,
    resetRule: { mode: 'duration', hours: 3 },
  },
];

/**
 * Inisialisasi seed awal jika belum ada
 */
export async function seedInitialServices(dbInstance?: IDBPDatabase): Promise<Service[]> {
  const existing = await getAllServices(dbInstance);
  const existingIds = new Set(existing.map((s) => s.id));
  const seeded: Service[] = [...existing];

  for (const item of DEFAULT_AI_SERVICES) {
    if (!existingIds.has(item.id)) {
      const created = await storageCreateService(item, dbInstance);
      seeded.push(created);
    }
  }

  return seeded;
}

/**
 * Tambah layanan baru dengan validasi skema URL http/https dan keunikan nama
 */
export async function createServiceWithValidation(
  service: {
    id?: string;
    name: string;
    urlTemplate: string;
    usesAuthuser: boolean;
    resetRule: ResetRule;
  },
  dbInstance?: IDBPDatabase
): Promise<Service> {
  const trimmedUrl = service.urlTemplate ? service.urlTemplate.trim() : '';
  const trimmedName = service.name ? service.name.trim() : '';

  if (!trimmedName) {
    throw new Error('Nama layanan wajib diisi.');
  }

  if (!isValidHttpUrl(trimmedUrl)) {
    throw new Error(`URL layanan tidak valid: "${service.urlTemplate}". Wajib menggunakan skema http:// atau https://.`);
  }

  const existing = await getAllServices(dbInstance);
  const duplicateName = existing.find(
    (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicateName) {
    throw new Error(`Layanan dengan nama "${trimmedName}" sudah ada.`);
  }

  const id = service.id || `srv-${Date.now()}`;

  return storageCreateService(
    {
      id,
      name: trimmedName,
      urlTemplate: trimmedUrl,
      usesAuthuser: service.usesAuthuser,
      resetRule: service.resetRule,
    },
    dbInstance
  );
}

/**
 * Update layanan dengan validasi skema URL http/https
 */
export async function updateServiceWithValidation(
  service: Service,
  dbInstance?: IDBPDatabase
): Promise<Service> {
  const trimmedUrl = service.urlTemplate ? service.urlTemplate.trim() : '';
  const trimmedName = service.name ? service.name.trim() : '';

  if (!trimmedName) {
    throw new Error('Nama layanan wajib diisi.');
  }

  if (!isValidHttpUrl(trimmedUrl)) {
    throw new Error(`URL layanan tidak valid: "${service.urlTemplate}". Wajib menggunakan skema http:// atau https://.`);
  }

  return storageUpdateService(
    {
      ...service,
      name: trimmedName,
      urlTemplate: trimmedUrl,
    },
    dbInstance
  );
}

/**
 * Hapus layanan dengan konfirmasi dan cascade delete (akses, logs, handoff notes)
 * Memerlukan konfirmasi pengguna (confirmed = true)
 */
export async function deleteServiceWithCascade(
  id: string,
  confirmed: boolean,
  dbInstance?: IDBPDatabase
): Promise<{ success: boolean; deletedId: string }> {
  if (!confirmed) {
    throw new Error('Penghapusan layanan memerlukan konfirmasi pengguna.');
  }

  const existing = await storageGetServiceById(id, dbInstance);
  if (!existing) {
    throw new Error(`Layanan dengan ID "${id}" tidak ditemukan.`);
  }

  // storageDeleteService mengeksekusi transaksi cascade: menghapus service, access terkait, logs terkait, dan handoff notes terkait
  await storageDeleteService(id, dbInstance);

  return { success: true, deletedId: id };
}
