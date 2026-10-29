/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ResetRuleMode = 'pacific_midnight' | 'duration' | 'manual';

export interface ResetRule {
  mode: ResetRuleMode;
  hours?: number; // dipakai bila mode: 'duration'
}

export interface Service {
  id: string;
  name: string;
  urlTemplate: string;
  usesAuthuser: boolean;
  resetRule: ResetRule;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  ownerName: string;   // UNIK
  googleEmail: string; // UNIK
  label: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type LoginMethod = 'google' | 'own';
export type AccessStatus = 'ready' | 'limited';

export interface Access {
  id: string;
  personId: string;    // FK -> Person.id
  serviceId: string;   // FK -> Service.id
  loginMethod: LoginMethod;
  loginName?: string;  // nama user/login di layanan sebagai pengingat
  status: AccessStatus;
  limitedAt?: string;
  resetAt?: string;
  activeSessionStart?: string;
  createdAt: string;
  updatedAt: string;
}

export type UsageLogType = 'opened' | 'stop' | 'limit_hit' | 'reset_ready' | 'note';

export interface UsageLog {
  id: string;
  accessId: string;    // FK -> Access.id
  type: UsageLogType;
  at: string;
  durationSec?: number;
  detail?: string;
}

export interface HandoffNote {
  id: string;
  serviceId: string;   // FK -> Service.id
  accessId: string;    // FK -> Access.id (akses aktif saat ditulis)
  authorName: string;  // nama pemilik akun aktif
  text: string;
  createdAt: string;
}

export interface Settings {
  id: string;          // singleton ID, misal 'default'
  resetTimezone: string;
  sheetEndpoint: string;
  sheetSecret: string;
  maxPersons: number;  // default: 10
  updatedAt: string;
}

export interface DatabaseSchema {
  services: Service;
  persons: Person;
  access: Access;
  logs: UsageLog;
  handoffNotes: HandoffNote;
  settings: Settings;
}
