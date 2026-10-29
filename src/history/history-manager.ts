/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IDBPDatabase } from 'idb';
import type { UsageLog, Person, Service, Access } from '../storage/types';
import {
  getAllLogs,
  getLogsByAccessId,
  getPersonById,
  updatePerson,
  getAllAccess,
  getAllPersons,
  getAllServices,
} from '../storage/db';

export interface EnrichedHistoryLog {
  log: UsageLog;
  access?: Access;
  person?: Person;
  service?: Service;
}

/**
 * Mengambil seluruh riwayat pemakaian terurut secara kronologis (terbaru di atas)
 */
export async function getAllChronologicalLogs(
  dbInstance?: IDBPDatabase
): Promise<EnrichedHistoryLog[]> {
  const [logs, accesses, persons, services] = await Promise.all([
    getAllLogs(dbInstance),
    getAllAccess(dbInstance),
    getAllPersons(dbInstance),
    getAllServices(dbInstance),
  ]);

  const accessMap = new Map(accesses.map((a) => [a.id, a]));
  const personMap = new Map(persons.map((p) => [p.id, p]));
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const enriched: EnrichedHistoryLog[] = logs.map((log) => {
    const access = accessMap.get(log.accessId);
    const person = access ? personMap.get(access.personId) : undefined;
    const service = access ? serviceMap.get(access.serviceId) : undefined;
    return { log, access, person, service };
  });

  return enriched.sort((a, b) => b.log.at.localeCompare(a.log.at));
}

/**
 * Menyimpan atau memperbarui catatan bebas akun (BR-09)
 */
export async function updateAccountNote(
  personId: string,
  newNote: string,
  dbInstance?: IDBPDatabase
): Promise<Person> {
  const person = await getPersonById(personId, dbInstance);
  if (!person) {
    throw new Error(`Akun dengan ID "${personId}" tidak ditemukan.`);
  }

  person.note = newNote.trim();
  return updatePerson(person, dbInstance);
}
