/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import type { Access, Person } from '../src/storage/types';
import {
  getReadyCountSinceLastOpen,
  getNextReadyAccountSuggestion,
} from '../src/ui/dashboard-helper';

describe('dashboard.test', () => {
  const mockPersons: Person[] = [
    { id: 'p-1', ownerName: 'Budi', googleEmail: 'budi@gmail.com', label: 'Akun 1', note: '', createdAt: '', updatedAt: '' },
    { id: 'p-2', ownerName: 'Siti', googleEmail: 'siti@gmail.com', label: 'Akun 2', note: '', createdAt: '', updatedAt: '' },
    { id: 'p-3', ownerName: 'Doni', googleEmail: 'doni@gmail.com', label: 'Akun 3', note: '', createdAt: '', updatedAt: '' },
  ];

  it('ready_count_on_open', () => {
    const baseNow = new Date('2026-10-29T12:00:00.000Z');
    const lastOpen = '2026-10-29T11:00:00.000Z'; // 1 jam lalu

    const mockAccesses: Access[] = [
      // Akses 1: ready sejak 11:30 (antara lastOpen dan now)
      { id: 'a-1', personId: 'p-1', serviceId: 'srv-1', loginMethod: 'google', status: 'ready', resetAt: '2026-10-29T11:30:00.000Z', createdAt: '', updatedAt: '' },
      // Akses 2: masih limited (reset jam 13:00)
      { id: 'a-2', personId: 'p-2', serviceId: 'srv-1', loginMethod: 'google', status: 'limited', resetAt: '2026-10-29T13:00:00.000Z', createdAt: '', updatedAt: '' },
      // Akses 3: limited tapi resetAt jam 11:45 (sehingga bertransisi ke ready)
      { id: 'a-3', personId: 'p-3', serviceId: 'srv-1', loginMethod: 'google', status: 'limited', resetAt: '2026-10-29T11:45:00.000Z', createdAt: '', updatedAt: '' },
    ];

    const result = getReadyCountSinceLastOpen(mockAccesses, lastOpen, baseNow);
    expect(result.count).toBe(2);
    expect(result.readyAccesses.map((a) => a.id)).toEqual(expect.arrayContaining(['a-1', 'a-3']));
  });

  it('next_ready_suggestion', () => {
    const baseNow = new Date('2026-10-29T12:00:00.000Z');

    const accesses: Access[] = [
      // p-1: sedang limited
      { id: 'a-1', personId: 'p-1', serviceId: 'srv-claude', loginMethod: 'google', status: 'limited', resetAt: '2026-10-29T14:00:00.000Z', createdAt: '', updatedAt: '' },
      // p-2: ready!
      { id: 'a-2', personId: 'p-2', serviceId: 'srv-claude', loginMethod: 'own', loginName: 'siti_claude', status: 'ready', createdAt: '', updatedAt: '' },
      // p-3: limited tapi reset lebih lambat (15:00)
      { id: 'a-3', personId: 'p-3', serviceId: 'srv-claude', loginMethod: 'google', status: 'limited', resetAt: '2026-10-29T15:00:00.000Z', createdAt: '', updatedAt: '' },
    ];

    // 1. Saat akun aktif adalah p-1 (yang limited), saran harus memilih p-2 (yang ready)
    const suggestion1 = getNextReadyAccountSuggestion('srv-claude', 'p-1', accesses, mockPersons, baseNow);
    expect(suggestion1.suggestedAccess?.id).toBe('a-2');
    expect(suggestion1.suggestedPerson?.ownerName).toBe('Siti');
    expect(suggestion1.reason).toContain('READY');

    // 2. Jika semua akun limited
    const allLimitedAccesses: Access[] = [
      { id: 'a-1', personId: 'p-1', serviceId: 'srv-claude', loginMethod: 'google', status: 'limited', resetAt: '2026-10-29T14:00:00.000Z', createdAt: '', updatedAt: '' },
      { id: 'a-3', personId: 'p-3', serviceId: 'srv-claude', loginMethod: 'google', status: 'limited', resetAt: '2026-10-29T15:00:00.000Z', createdAt: '', updatedAt: '' },
    ];
    const suggestionAllLimited = getNextReadyAccountSuggestion('srv-claude', 'p-1', allLimitedAccesses, mockPersons, baseNow);
    expect(suggestionAllLimited.suggestedAccess?.id).toBe('a-1'); // p-1 reset jam 14:00 (lebih cepat dari 15:00)
    expect(suggestionAllLimited.reason).toContain('reset paling cepat');
  });
});
