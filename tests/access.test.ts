/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase } from '../src/storage/db';
import {
  createAccount,
  createAccountAccess,
  updateAccountAccess,
  getAccessesByPersonId,
} from '../src/accounts/account-manager';
import { createServiceWithValidation } from '../src/services/service-manager';

describe('access.test', () => {
  let dbCounter = 0;
  beforeEach(() => {
    dbCounter += 1;
  });

  const getTestDbName = () => `test_access_db_${Date.now()}_${dbCounter}`;

  it('one_person_many_services', async () => {
    const db = await getDatabase(getTestDbName());

    // 1. Buat 1 Person
    const person = await createAccount(
      {
        id: 'person-multi',
        ownerName: 'Multi User',
        googleEmail: 'multi@gmail.com',
      },
      db
    );

    // 2. Buat 3 Services berbeda
    const srv1 = await createServiceWithValidation(
      { name: 'Service A', urlTemplate: 'https://a.com', usesAuthuser: true, resetRule: { mode: 'pacific_midnight' } },
      db
    );
    const srv2 = await createServiceWithValidation(
      { name: 'Service B', urlTemplate: 'https://b.com', usesAuthuser: false, resetRule: { mode: 'duration', hours: 4 } },
      db
    );
    const srv3 = await createServiceWithValidation(
      { name: 'Service C', urlTemplate: 'https://c.com', usesAuthuser: false, resetRule: { mode: 'duration', hours: 2 } },
      db
    );

    // 3. Daftarkan akses person ke 3 service tersebut (1 person -> many services)
    const acc1 = await createAccountAccess({ personId: person.id, serviceId: srv1.id, loginMethod: 'google' }, db);
    const acc2 = await createAccountAccess({ personId: person.id, serviceId: srv2.id, loginMethod: 'own', loginName: 'my_claude_user' }, db);
    const acc3 = await createAccountAccess({ personId: person.id, serviceId: srv3.id, loginMethod: 'own', loginName: 'deepseek_handle' }, db);

    const personAccesses = await getAccessesByPersonId(person.id, db);
    expect(personAccesses).toHaveLength(3);
    expect(personAccesses.map((a) => a.id)).toEqual(
      expect.arrayContaining([acc1.id, acc2.id, acc3.id])
    );

    // 4. Mendaftarkan ulang akses ke srv1 untuk person yang sama harus ditolak (duplikasi personId, serviceId)
    await expect(
      createAccountAccess({ personId: person.id, serviceId: srv1.id, loginMethod: 'google' }, db)
    ).rejects.toThrow(/sudah ada/);
  });

  it('login_method_and_name', async () => {
    const db = await getDatabase(getTestDbName());

    const person = await createAccount(
      {
        id: 'person-login-test',
        ownerName: 'Fajar',
        googleEmail: 'fajar@gmail.com',
      },
      db
    );

    const srvClaude = await createServiceWithValidation(
      { name: 'Anthropic Claude', urlTemplate: 'https://claude.ai', usesAuthuser: false, resetRule: { mode: 'duration', hours: 5 } },
      db
    );

    // Buat akses dengan loginMethod 'own' dan loginName
    const access = await createAccountAccess(
      {
        personId: person.id,
        serviceId: srvClaude.id,
        loginMethod: 'own',
        loginName: 'fajar_anthropic_corp',
      },
      db
    );

    expect(access.loginMethod).toBe('own');
    expect(access.loginName).toBe('fajar_anthropic_corp');
    expect(access.status).toBe('ready');

    // Update loginMethod ke 'google' dan update loginName
    const updated = await updateAccountAccess(
      {
        ...access,
        loginMethod: 'google',
        loginName: 'fajar.work@company.com',
      },
      db
    );

    expect(updated.loginMethod).toBe('google');
    expect(updated.loginName).toBe('fajar.work@company.com');
  });
});
