/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IDBPDatabase } from 'idb';
import type { HandoffNote } from '../storage/types';
import {
  addHandoffNote as storageAddHandoffNote,
  getHandoffNotesByServiceId as storageGetHandoffNotes,
  getAccessById,
  getPersonById,
  addLog,
} from '../storage/db';

/**
 * Buat Catatan Lanjutan bersama per layanan (BR-15):
 * - Ditulis atas nama pemilik akun yang sedang aktif (authorName = person.ownerName).
 * - Tampil saat anggota tim memilih atau switch akun pada layanan yang sama.
 */
export async function createHandoffNote(
  serviceId: string,
  accessId: string,
  text: string,
  options?: {
    now?: Date;
    dbInstance?: IDBPDatabase;
  }
): Promise<HandoffNote> {
  const db = options?.dbInstance;
  const now = options?.now || new Date();
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error('Isi Catatan Lanjutan tidak boleh kosong.');
  }

  const access = await getAccessById(accessId, db);
  if (!access) {
    throw new Error(`Akses dengan ID "${accessId}" tidak ditemukan.`);
  }

  const person = await getPersonById(access.personId, db);
  if (!person) {
    throw new Error(`Data pemilik akun (${access.personId}) tidak ditemukan.`);
  }

  const newNote = await storageAddHandoffNote(
    {
      id: `hn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serviceId,
      accessId,
      authorName: person.ownerName,
      text: trimmed,
      createdAt: now.toISOString(),
    },
    db
  );

  // Catat ke usage log bertipe note
  await addLog(
    {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accessId,
      type: 'note',
      at: now.toISOString(),
      detail: `Catatan lanjutan ditinggalkan oleh ${person.ownerName}: "${trimmed.slice(0, 60)}${trimmed.length > 60 ? '...' : ''}"`,
    },
    db
  );

  return newNote;
}

/**
 * Mengambil Catatan Lanjutan untuk suatu layanan terurut dari terbaru ke terlama
 */
export async function getHandoffNotesForService(
  serviceId: string,
  dbInstance?: IDBPDatabase
): Promise<HandoffNote[]> {
  const notes = await storageGetHandoffNotes(serviceId, dbInstance);
  return notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Mengambil catatan lanjutan paling mutakhir untuk ditampilkan saat switch akun (BR-15)
 */
export async function getLatestHandoffNote(
  serviceId: string,
  dbInstance?: IDBPDatabase
): Promise<HandoffNote | null> {
  const notes = await getHandoffNotesForService(serviceId, dbInstance);
  return notes.length > 0 ? notes[0] : null;
}
