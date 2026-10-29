/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IDBPDatabase } from 'idb';
import type { Person, Access, LoginMethod } from '../storage/types';
import {
  getAllPersons as storageGetAllPersons,
  getPersonById as storageGetPersonById,
  createPerson as storageCreatePerson,
  updatePerson as storageUpdatePerson,
  deletePerson as storageDeletePerson,
  getAllAccess as storageGetAllAccess,
  createAccess as storageCreateAccess,
  updateAccess as storageUpdateAccess,
  deleteAccess as storageDeleteAccess,
  getSettings,
} from '../storage/db';

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Buat Akun Google baru (Person) dengan validasi lengkap
 */
export async function createAccount(
  data: {
    id?: string;
    ownerName: string;
    googleEmail: string;
    label?: string;
    note?: string;
  },
  dbInstance?: IDBPDatabase
): Promise<Person> {
  const trimmedOwner = data.ownerName ? data.ownerName.trim() : '';
  const trimmedEmail = data.googleEmail ? data.googleEmail.trim() : '';

  if (!trimmedOwner) {
    throw new Error('Nama pemilik akun (ownerName) wajib diisi.');
  }

  if (!trimmedEmail) {
    throw new Error('Email Google wajib diisi.');
  }

  if (!isValidEmail(trimmedEmail)) {
    throw new Error(`Format email Google tidak valid: "${data.googleEmail}".`);
  }

  const id = data.id || `person-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  return storageCreatePerson(
    {
      id,
      ownerName: trimmedOwner,
      googleEmail: trimmedEmail,
      label: data.label ? data.label.trim() : 'Akun Utama',
      note: data.note ? data.note.trim() : '',
    },
    dbInstance
  );
}

/**
 * Update data Akun Google
 */
export async function updateAccount(
  person: Person,
  dbInstance?: IDBPDatabase
): Promise<Person> {
  const trimmedOwner = person.ownerName ? person.ownerName.trim() : '';
  const trimmedEmail = person.googleEmail ? person.googleEmail.trim() : '';

  if (!trimmedOwner) {
    throw new Error('Nama pemilik akun (ownerName) wajib diisi.');
  }

  if (!trimmedEmail) {
    throw new Error('Email Google wajib diisi.');
  }

  if (!isValidEmail(trimmedEmail)) {
    throw new Error(`Format email Google tidak valid: "${person.googleEmail}".`);
  }

  return storageUpdatePerson(
    {
      ...person,
      ownerName: trimmedOwner,
      googleEmail: trimmedEmail,
      label: person.label.trim(),
      note: person.note.trim(),
    },
    dbInstance
  );
}

/**
 * Hapus Akun Google dengan konfirmasi eksplisit & cascade delete (menghapus Access dan Logs terkait)
 */
export async function deleteAccountWithCascade(
  id: string,
  confirmed: boolean,
  dbInstance?: IDBPDatabase
): Promise<{ success: boolean; deletedId: string }> {
  if (!confirmed) {
    throw new Error('Penghapusan akun memerlukan konfirmasi pengguna.');
  }

  const existing = await storageGetPersonById(id, dbInstance);
  if (!existing) {
    throw new Error(`Akun dengan ID "${id}" tidak ditemukan.`);
  }

  await storageDeletePerson(id, dbInstance);
  return { success: true, deletedId: id };
}

/**
 * Buat atau daftarkan akses akun pada suatu layanan AI
 */
export async function createAccountAccess(
  data: {
    id?: string;
    personId: string;
    serviceId: string;
    loginMethod?: LoginMethod;
    loginName?: string;
  },
  dbInstance?: IDBPDatabase
): Promise<Access> {
  const id = data.id || `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  return storageCreateAccess(
    {
      id,
      personId: data.personId,
      serviceId: data.serviceId,
      loginMethod: data.loginMethod || 'google',
      loginName: data.loginName ? data.loginName.trim() : undefined,
      status: 'ready',
    },
    dbInstance
  );
}

/**
 * Update akses (misalnya mengubah metode login atau nama user di layanan)
 */
export async function updateAccountAccess(
  access: Access,
  dbInstance?: IDBPDatabase
): Promise<Access> {
  return storageUpdateAccess(
    {
      ...access,
      loginName: access.loginName ? access.loginName.trim() : undefined,
    },
    dbInstance
  );
}

/**
 * Hapus akses spesifik
 */
export async function deleteAccountAccess(
  accessId: string,
  dbInstance?: IDBPDatabase
): Promise<void> {
  await storageDeleteAccess(accessId, dbInstance);
}

/**
 * Ambil semua akses milik suatu akun (Person)
 */
export async function getAccessesByPersonId(
  personId: string,
  dbInstance?: IDBPDatabase
): Promise<Access[]> {
  const all = await storageGetAllAccess(dbInstance);
  return all.filter((a) => a.personId === personId);
}

/**
 * Ambil semua akses yang terhubung pada suatu layanan (Service)
 */
export async function getAccessesByServiceId(
  serviceId: string,
  dbInstance?: IDBPDatabase
): Promise<Access[]> {
  const all = await storageGetAllAccess(dbInstance);
  return all.filter((a) => a.serviceId === serviceId);
}

/**
 * Mengambil Person beserta seluruh daftar akses layanannya
 */
export async function getPersonWithAccesses(
  personId: string,
  dbInstance?: IDBPDatabase
): Promise<{ person: Person; accesses: Access[] } | null> {
  const person = await storageGetPersonById(personId, dbInstance);
  if (!person) return null;

  const accesses = await getAccessesByPersonId(personId, dbInstance);
  return { person, accesses };
}
