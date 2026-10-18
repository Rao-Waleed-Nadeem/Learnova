import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRoleChange,
  validateAccountStatusChange,
  filterUsers,
  filterAuditEvents,
  maskIpAddress,
  generateCorrelationId,
} from './adminLogic.ts';
import type { UserAccount, AuditEvent } from './adminLogic.ts';

const mockAdmin = { id: 'adm-1', role: 'administrator' as const };
const mockTeacher = { id: 'tch-1', role: 'teacher' as const };

const mockUsers: UserAccount[] = [
  {
    id: 'adm-1',
    name: 'Sarah Connor',
    email: 'sarah@learnova.edu',
    role: 'administrator',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'adm-2',
    name: 'John Matrix',
    email: 'john@learnova.edu',
    role: 'administrator',
    isActive: true,
    createdAt: '2026-09-02T00:00:00Z',
  },
  {
    id: 'tch-1',
    name: 'Dr. Elena Rostova',
    email: 'elena@learnova.edu',
    role: 'teacher',
    isActive: true,
    createdAt: '2026-09-05T00:00:00Z',
  },
  {
    id: 'std-1',
    name: 'Alex Rivera',
    email: 'alex@learnova.edu',
    role: 'student',
    isActive: true,
    createdAt: '2026-09-10T00:00:00Z',
  },
  {
    id: 'std-2',
    name: 'Marcus Brody',
    email: 'marcus@learnova.edu',
    role: 'student',
    isActive: false,
    createdAt: '2026-09-12T00:00:00Z',
  },
];

test('validateRoleChange prevents non-admin actors from changing roles', () => {
  const result = validateRoleChange(mockTeacher, mockUsers[3], 'teacher', mockUsers);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /Unauthorized/i);
});

test('validateRoleChange prevents changing to the exact same role', () => {
  const result = validateRoleChange(mockAdmin, mockUsers[3], 'student', mockUsers);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /already assigned/i);
});

test('validateRoleChange prevents self-demotion of currently logged in admin', () => {
  const result = validateRoleChange(mockAdmin, mockUsers[0], 'teacher', mockUsers);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /Self-Demotion/i);
});

test('validateRoleChange prevents demoting the last active administrator', () => {
  // If there is only 1 admin left
  const singleAdminList = mockUsers.filter((u) => u.id !== 'adm-2');
  const actor = { id: 'other-adm', role: 'administrator' as const };
  const targetAdmin = singleAdminList[0]; // adm-1

  const result = validateRoleChange(actor, targetAdmin, 'teacher', singleAdminList);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /last active administrator/i);
});

test('validateRoleChange allows valid role transition when safeguards pass', () => {
  const result = validateRoleChange(mockAdmin, mockUsers[3], 'teacher', mockUsers);
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('validateAccountStatusChange prevents self-deactivation', () => {
  const result = validateAccountStatusChange(mockAdmin, mockUsers[0], false, mockUsers);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /Self-Lockout/i);
});

test('validateAccountStatusChange prevents deactivating the last active administrator', () => {
  const singleAdminList = mockUsers.filter((u) => u.id !== 'adm-2');
  const actor = { id: 'other-adm', role: 'administrator' as const };
  const targetAdmin = singleAdminList[0];

  const result = validateAccountStatusChange(actor, targetAdmin, false, singleAdminList);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /last active administrator/i);
});

test('validateAccountStatusChange allows deactivation of regular accounts', () => {
  const result = validateAccountStatusChange(mockAdmin, mockUsers[3], false, mockUsers);
  assert.equal(result.valid, true);
});

test('filterUsers filters by search query and role', () => {
  const queryResult = filterUsers(mockUsers, 'Elena', 'all', 'all');
  assert.equal(queryResult.length, 1);
  assert.equal(queryResult[0].name, 'Dr. Elena Rostova');

  const roleResult = filterUsers(mockUsers, '', 'student', 'all');
  assert.equal(roleResult.length, 2);

  const inactiveResult = filterUsers(mockUsers, '', 'all', 'inactive');
  assert.equal(inactiveResult.length, 1);
  assert.equal(inactiveResult[0].id, 'std-2');
});

test('filterAuditEvents filters by action, outcome, and keyword', () => {
  const mockEvents: AuditEvent[] = [
    {
      id: 'aud-1',
      timestamp: '2026-10-17T12:00:00Z',
      actorId: 'adm-1',
      actorName: 'Sarah Connor',
      actorEmail: 'sarah@learnova.edu',
      actorRole: 'administrator',
      action: 'ROLE_CHANGE',
      targetType: 'user',
      targetId: 'std-1',
      targetName: 'Alex Rivera',
      outcome: 'success',
      correlationId: 'corr-101',
      reason: 'Promoted to student tutor',
    },
    {
      id: 'aud-2',
      timestamp: '2026-10-17T13:00:00Z',
      actorId: 'adm-1',
      actorName: 'Sarah Connor',
      actorEmail: 'sarah@learnova.edu',
      actorRole: 'administrator',
      action: 'ACCOUNT_DEACTIVATED',
      targetType: 'user',
      targetId: 'std-2',
      targetName: 'Marcus Brody',
      outcome: 'blocked',
      correlationId: 'corr-102',
      reason: 'Account violation review',
    },
  ];

  const actionFilterResult = filterAuditEvents(mockEvents, 'ROLE_CHANGE', 'all', '');
  assert.equal(actionFilterResult.length, 1);
  assert.equal(actionFilterResult[0].id, 'aud-1');

  const outcomeFilterResult = filterAuditEvents(mockEvents, 'all', 'blocked', '');
  assert.equal(outcomeFilterResult.length, 1);
  assert.equal(outcomeFilterResult[0].id, 'aud-2');

  const searchResult = filterAuditEvents(mockEvents, 'all', 'all', 'Marcus');
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].targetName, 'Marcus Brody');
});

test('maskIpAddress masks IPv4 and strings cleanly', () => {
  assert.equal(maskIpAddress('192.168.1.45'), '192.168.***.*** (Masked)');
  assert.equal(maskIpAddress(''), '0.0.0.0 (Masked)');
});

test('generateCorrelationId produces unique correlation identifiers', () => {
  const id1 = generateCorrelationId();
  const id2 = generateCorrelationId();
  assert.notEqual(id1, id2);
  assert.match(id1, /^corr-/);
});
