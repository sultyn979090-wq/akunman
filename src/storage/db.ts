/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, type IDBPDatabase } from 'idb';
import type {
  Service,
  Person,
  Access,
  UsageLog,
  HandoffNote,
  Settings,
} from './types';

export const DB_NAME = 'ai_account_manager_db';
export const DB_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  id: 'default',
  resetTimezone: 'America/Los_Angeles',
  sheetEndpoint: '',
  sheetSecret: '',
  maxPersons: 10,
  updatedAt: new Date().toISOString(),
};

/**
 * Membuka koneksi IndexedDB dengan migrasi skema terjaga
 */
export async function getDatabase(customName = DB_NAME, version = DB_VERSION): Promise<IDBPDatabase> {
  return openDB(customName, version, {
    upgrade(db, oldVersion, newVersion) {
      // Skema Versi 1
      if (oldVersion < 1) {
        // Store Services
        if (!db.objectStoreNames.contains('services')) {
          db.createObjectStore('services', { keyPath: 'id' });
        }

        // Store Persons
        if (!db.objectStoreNames.contains('persons')) {
          const personStore = db.createObjectStore('persons', { keyPath: 'id' });
          personStore.createIndex('by_ownerName', 'ownerName', { unique: true });
          personStore.createIndex('by_googleEmail', 'googleEmail', { unique: true });
        }

        // Store Access
        if (!db.objectStoreNames.contains('access')) {
          const accessStore = db.createObjectStore('access', { keyPath: 'id' });
          accessStore.createIndex('by_personId', 'personId');
          accessStore.createIndex('by_serviceId', 'serviceId');
          accessStore.createIndex('by_person_service', ['personId', 'serviceId'], { unique: true });
        }

        // Store UsageLogs
        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id' });
          logStore.createIndex('by_accessId', 'accessId');
          logStore.createIndex('by_at', 'at');
        }

        // Store HandoffNotes
        if (!db.objectStoreNames.contains('handoffNotes')) {
          const handoffStore = db.createObjectStore('handoffNotes', { keyPath: 'id' });
          handoffStore.createIndex('by_serviceId', 'serviceId');
          handoffStore.createIndex('by_createdAt', 'createdAt');
        }

        // Store Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      }

      // Jalur migrasi masa depan (misal oldVersion < 2) dapat ditambahkan di sini
      // tanpa menghapus store lama sehingga data tidak hilang.
      if (oldVersion < 2 && newVersion && newVersion >= 2) {
        // placeholder migrasi v2 jika diperlukan
      }
    },
  });
}

// ==========================================
// CRUD & CONSTRAINT: SETTINGS
// ==========================================

export async function getSettings(dbInstance?: IDBPDatabase): Promise<Settings> {
  const db = dbInstance || (await getDatabase());
  const existing = await db.get('settings', 'default');
  if (!existing) {
    await db.put('settings', DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return existing;
}

export async function saveSettings(settings: Partial<Settings>, dbInstance?: IDBPDatabase): Promise<Settings> {
  const db = dbInstance || (await getDatabase());
  const current = await getSettings(db);
  const updated: Settings = {
    ...current,
    ...settings,
    id: 'default',
    updatedAt: new Date().toISOString(),
  };
  await db.put('settings', updated);
  return updated;
}

// ==========================================
// CRUD & CONSTRAINT: PERSONS
// ==========================================

export async function getAllPersons(dbInstance?: IDBPDatabase): Promise<Person[]> {
  const db = dbInstance || (await getDatabase());
  return db.getAll('persons');
}

export async function getPersonById(id: string, dbInstance?: IDBPDatabase): Promise<Person | undefined> {
  const db = dbInstance || (await getDatabase());
  return db.get('persons', id);
}

export async function createPerson(person: Omit<Person, 'createdAt' | 'updatedAt'>, dbInstance?: IDBPDatabase): Promise<Person> {
  const db = dbInstance || (await getDatabase());
  const settings = await getSettings(db);
  const existing = await getAllPersons(db);

  // Constraint 1: Maksimal 10 akun (BR-07, ASM-02)
  if (existing.length >= settings.maxPersons) {
    throw new Error(`Batas maksimal ${settings.maxPersons} akun Google tercapai. Akun ke-${existing.length + 1} ditolak.`);
  }

  const normalizedOwner = person.ownerName.trim().toLowerCase();
  const normalizedEmail = person.googleEmail.trim().toLowerCase();

  // Constraint 2: Unik ownerName & googleEmail (BR-14)
  for (const p of existing) {
    if (p.ownerName.trim().toLowerCase() === normalizedOwner) {
      throw new Error(`Nama pemilik akun "${person.ownerName}" sudah terdaftar.`);
    }
    if (p.googleEmail.trim().toLowerCase() === normalizedEmail) {
      throw new Error(`Email Google "${person.googleEmail}" sudah terdaftar.`);
    }
  }

  const now = new Date().toISOString();
  const newPerson: Person = {
    ...person,
    ownerName: person.ownerName.trim(),
    googleEmail: person.googleEmail.trim(),
    createdAt: now,
    updatedAt: now,
  };

  await db.add('persons', newPerson);
  return newPerson;
}

export async function updatePerson(person: Person, dbInstance?: IDBPDatabase): Promise<Person> {
  const db = dbInstance || (await getDatabase());
  const existing = await getAllPersons(db);

  const normalizedOwner = person.ownerName.trim().toLowerCase();
  const normalizedEmail = person.googleEmail.trim().toLowerCase();

  for (const p of existing) {
    if (p.id !== person.id) {
      if (p.ownerName.trim().toLowerCase() === normalizedOwner) {
        throw new Error(`Nama pemilik akun "${person.ownerName}" sudah digunakan akun lain.`);
      }
      if (p.googleEmail.trim().toLowerCase() === normalizedEmail) {
        throw new Error(`Email Google "${person.googleEmail}" sudah digunakan akun lain.`);
      }
    }
  }

  const updated: Person = {
    ...person,
    ownerName: person.ownerName.trim(),
    googleEmail: person.googleEmail.trim(),
    updatedAt: new Date().toISOString(),
  };

  await db.put('persons', updated);
  return updated;
}

export async function deletePerson(id: string, dbInstance?: IDBPDatabase): Promise<void> {
  const db = dbInstance || (await getDatabase());
  const tx = db.transaction(['persons', 'access', 'logs'], 'readwrite');
  
  // Hapus person
  await tx.objectStore('persons').delete(id);

  // Cascade delete access & logs
  const accessStore = tx.objectStore('access');
  const accessList: Access[] = await accessStore.getAll();
  const relatedAccessIds: string[] = [];

  for (const a of accessList) {
    if (a.personId === id) {
      relatedAccessIds.push(a.id);
      await accessStore.delete(a.id);
    }
  }

  const logStore = tx.objectStore('logs');
  const logs: UsageLog[] = await logStore.getAll();
  for (const log of logs) {
    if (relatedAccessIds.includes(log.accessId)) {
      await logStore.delete(log.id);
    }
  }

  await tx.done;
}

// ==========================================
// CRUD & CONSTRAINT: SERVICES
// ==========================================

export async function getAllServices(dbInstance?: IDBPDatabase): Promise<Service[]> {
  const db = dbInstance || (await getDatabase());
  return db.getAll('services');
}

export async function getServiceById(id: string, dbInstance?: IDBPDatabase): Promise<Service | undefined> {
  const db = dbInstance || (await getDatabase());
  return db.get('services', id);
}

export async function createService(service: Omit<Service, 'createdAt' | 'updatedAt'>, dbInstance?: IDBPDatabase): Promise<Service> {
  const db = dbInstance || (await getDatabase());

  // Validasi skema http/https
  const trimmedUrl = service.urlTemplate.trim();
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    throw new Error('URL layanan wajib menggunakan skema http:// atau https://.');
  }

  const now = new Date().toISOString();
  const newService: Service = {
    ...service,
    urlTemplate: trimmedUrl,
    createdAt: now,
    updatedAt: now,
  };

  await db.add('services', newService);
  return newService;
}

export async function updateService(service: Service, dbInstance?: IDBPDatabase): Promise<Service> {
  const db = dbInstance || (await getDatabase());
  const trimmedUrl = service.urlTemplate.trim();
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    throw new Error('URL layanan wajib menggunakan skema http:// atau https://.');
  }

  const updated: Service = {
    ...service,
    urlTemplate: trimmedUrl,
    updatedAt: new Date().toISOString(),
  };

  await db.put('services', updated);
  return updated;
}

export async function deleteService(id: string, dbInstance?: IDBPDatabase): Promise<void> {
  const db = dbInstance || (await getDatabase());
  const tx = db.transaction(['services', 'access', 'logs', 'handoffNotes'], 'readwrite');

  // Hapus layanan
  await tx.objectStore('services').delete(id);

  // Cascade delete access terkait layanan
  const accessStore = tx.objectStore('access');
  const allAccess: Access[] = await accessStore.getAll();
  const relatedAccessIds: string[] = [];

  for (const a of allAccess) {
    if (a.serviceId === id) {
      relatedAccessIds.push(a.id);
      await accessStore.delete(a.id);
    }
  }

  // Cascade delete logs terkait
  const logStore = tx.objectStore('logs');
  const allLogs: UsageLog[] = await logStore.getAll();
  for (const log of allLogs) {
    if (relatedAccessIds.includes(log.accessId)) {
      await logStore.delete(log.id);
    }
  }

  // Cascade delete handoffNotes terkait
  const handoffStore = tx.objectStore('handoffNotes');
  const allHandoffs: HandoffNote[] = await handoffStore.getAll();
  for (const h of allHandoffs) {
    if (h.serviceId === id) {
      await handoffStore.delete(h.id);
    }
  }

  await tx.done;
}

// ==========================================
// CRUD & CONSTRAINT: ACCESS
// ==========================================

export async function getAllAccess(dbInstance?: IDBPDatabase): Promise<Access[]> {
  const db = dbInstance || (await getDatabase());
  return db.getAll('access');
}

export async function getAccessById(id: string, dbInstance?: IDBPDatabase): Promise<Access | undefined> {
  const db = dbInstance || (await getDatabase());
  return db.get('access', id);
}

export async function createAccess(access: Omit<Access, 'createdAt' | 'updatedAt'>, dbInstance?: IDBPDatabase): Promise<Access> {
  const db = dbInstance || (await getDatabase());
  const allAccess = await getAllAccess(db);

  // Constraint: (personId, serviceId) unik (BR-14)
  const existing = allAccess.find(
    (a) => a.personId === access.personId && a.serviceId === access.serviceId
  );
  if (existing) {
    throw new Error(`Akses untuk akun [${access.personId}] pada layanan [${access.serviceId}] sudah ada.`);
  }

  const now = new Date().toISOString();
  const newAccess: Access = {
    ...access,
    createdAt: now,
    updatedAt: now,
  };

  await db.add('access', newAccess);
  return newAccess;
}

export async function updateAccess(access: Access, dbInstance?: IDBPDatabase): Promise<Access> {
  const db = dbInstance || (await getDatabase());
  const updated: Access = {
    ...access,
    updatedAt: new Date().toISOString(),
  };
  await db.put('access', updated);
  return updated;
}

export async function deleteAccess(id: string, dbInstance?: IDBPDatabase): Promise<void> {
  const db = dbInstance || (await getDatabase());
  const tx = db.transaction(['access', 'logs'], 'readwrite');
  await tx.objectStore('access').delete(id);

  const logStore = tx.objectStore('logs');
  const allLogs: UsageLog[] = await logStore.getAll();
  for (const log of allLogs) {
    if (log.accessId === id) {
      await logStore.delete(log.id);
    }
  }
  await tx.done;
}

// ==========================================
// CRUD: USAGE LOGS
// ==========================================

export async function addLog(log: Omit<UsageLog, 'at'> & { at?: string }, dbInstance?: IDBPDatabase): Promise<UsageLog> {
  const db = dbInstance || (await getDatabase());
  const newLog: UsageLog = {
    ...log,
    at: log.at || new Date().toISOString(),
  };
  await db.add('logs', newLog);
  return newLog;
}

export async function getLogsByAccessId(accessId: string, dbInstance?: IDBPDatabase): Promise<UsageLog[]> {
  const db = dbInstance || (await getDatabase());
  const logs: UsageLog[] = await db.getAllFromIndex('logs', 'by_accessId', accessId);
  return logs.sort((a, b) => b.at.localeCompare(a.at));
}

export async function getAllLogs(dbInstance?: IDBPDatabase): Promise<UsageLog[]> {
  const db = dbInstance || (await getDatabase());
  const logs: UsageLog[] = await db.getAll('logs');
  return logs.sort((a, b) => b.at.localeCompare(a.at));
}

// ==========================================
// CRUD: HANDOFF NOTES
// ==========================================

export async function addHandoffNote(note: Omit<HandoffNote, 'createdAt'> & { createdAt?: string }, dbInstance?: IDBPDatabase): Promise<HandoffNote> {
  const db = dbInstance || (await getDatabase());
  const newNote: HandoffNote = {
    ...note,
    createdAt: note.createdAt || new Date().toISOString(),
  };
  await db.add('handoffNotes', newNote);
  return newNote;
}

export async function getHandoffNotesByServiceId(serviceId: string, dbInstance?: IDBPDatabase): Promise<HandoffNote[]> {
  const db = dbInstance || (await getDatabase());
  const notes: HandoffNote[] = await db.getAllFromIndex('handoffNotes', 'by_serviceId', serviceId);
  return notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
