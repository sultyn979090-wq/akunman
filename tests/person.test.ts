/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, getAllAccess, getAllLogs, addLog } from '../src/storage/db';
import {
  createAccount,
  updateAccount,
  deleteAccountWithCascade,
  createAccountAccess,
} from '../src/accounts/account-manager';
import { createServiceWithValidation } from '../src/services/service-manager';

describe('person.test', () => {
  let dbCounter = 0;
  beforeEach(() => {
    dbCounter += 1;
  });

  const getTestDbName = () => `test_person_db_${Date.now()}_${dbCounter}`;

  it('unique_constraints', async () => {
    const db = await getDatabase(getTestDbName());

    await createAccount(
      {
        id: 'p-1',
        ownerName: 'Budi Santoso',
        googleEmail: 'budi@gmail.com',
        label: 'Akun 1',
      },
      db
    );

    // 1. Duplikasi ownerName dengan whitespace & huruf besar/kecil
    await expect(
      createAccount(
        {
          ownerName: '  budi santoso  ',
          googleEmail: 'budi_lain@gmail.com',
          label: 'Akun 2',
        },
        db
      )
    ).rejects.toThrow(/Nama pemilik akun .* sudah terdaftar/);

    // 2. Duplikasi googleEmail dengan whitespace & huruf besar/kecil
    await expect(
      createAccount(
        {
          ownerName: 'Nama Baru',
          googleEmail: '  BUDI@gmail.com  ',
          label: 'Akun 3',
        },
        db
      )
    ).rejects.toThrow(/Email Google .* sudah terdaftar/);

    // 3. Format email tidak valid
    await expect(
      createAccount(
        {
          ownerName: 'Citra',
          googleEmail: 'bukan-email',
          label: 'Akun 4',
        },
        db
      )
    ).rejects.toThrow(/Format email Google tidak valid/);
  });

  it('max_10', async () => {
    const db = await getDatabase(getTestDbName());

    // Buat tepat 10 akun
    for (let i = 1; i <= 10; i++) {
      await createAccount(
        {
          id: `p-${i}`,
          ownerName: `Owner ${i}`,
          googleEmail: `owner${i}@gmail.com`,
          label: `Akun ${i}`,
        },
        db
      );
    }

    // Akun ke-11 harus ditolak
    await expect(
      createAccount(
        {
          id: 'p-11',
          ownerName: 'Owner 11',
          googleEmail: 'owner11@gmail.com',
          label: 'Akun 11',
        },
        db
      )
    ).rejects.toThrow(/Batas maksimal 10 akun Google tercapai. Akun ke-11 ditolak./);
  });

  it('delete_cascades', async () => {
    const db = await getDatabase(getTestDbName());

    // 1. Buat Service
    const service = await createServiceWithValidation(
      {
        id: 'srv-test',
        name: 'Google AI Studio',
        urlTemplate: 'https://aistudio.google.com',
        usesAuthuser: true,
        resetRule: { mode: 'pacific_midnight' },
      },
      db
    );

    // 2. Buat Person
    const person = await createAccount(
      {
        id: 'person-to-delete',
        ownerName: 'Doni',
        googleEmail: 'doni@gmail.com',
        label: 'Doni Dev',
      },
      db
    );

    // 3. Buat Access untuk person ini
    const access = await createAccountAccess(
      {
        id: 'acc-doni',
        personId: person.id,
        serviceId: service.id,
        loginMethod: 'google',
      },
      db
    );

    // 4. Buat Log untuk access ini
    await addLog(
      {
        id: 'log-doni',
        accessId: access.id,
        type: 'opened',
        detail: 'Sesi Doni dibuka',
      },
      db
    );

    expect(await getAllAccess(db)).toHaveLength(1);
    expect(await getAllLogs(db)).toHaveLength(1);

    // Hapus tanpa konfirmasi harus ditolak
    await expect(deleteAccountWithCascade(person.id, false, db)).rejects.toThrow(
      /memerlukan konfirmasi pengguna/
    );

    // Hapus dengan konfirmasi
    const delResult = await deleteAccountWithCascade(person.id, true, db);
    expect(delResult.success).toBe(true);

    // Verifikasi cascade: access dan logs terhapus
    const remainingAccess = await getAllAccess(db);
    expect(remainingAccess.find((a) => a.personId === person.id)).toBeUndefined();

    const remainingLogs = await getAllLogs(db);
    expect(remainingLogs.find((l) => l.accessId === access.id)).toBeUndefined();
  });
});
