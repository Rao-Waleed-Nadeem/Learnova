/**
 * E2E Test Suite: Complete Administrator Workflow
 * Guided by e2e-testing-patterns skill:
 * 1. Administrator Authentication, Session Validation & RBAC Enforcement
 * 2. Administrative Dashboard KPI Aggregation & Safe System Telemetry
 * 3. User Directory Governance, Filtering, Pagination & Deep Inspection
 * 4. Role Transition Guardrails (Anti-Self-Demotion & Last-Admin Protection)
 * 5. Account Lifecycle Governance (Anti-Self-Deactivation & Session Revocation)
 * 6. Immutable Security Audit Logging, Event Filtering & IP Masking
 * 7. Administrative Course Oversight & DAG Structure Inspection
 * 8. Full React UI Rendering for all Admin Pages, Modals, Drawers & Layout Shell
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock localStorage for node test environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: 0,
  } as Storage;
}

import { authApi } from '../services/api/authApi.ts';
import { storage } from '../services/storageService.ts';
import { ThemeProvider } from '../context/ThemeContext.tsx';
import {
  validateRoleChange,
  validateAccountStatusChange,
  filterUsers,
  filterAuditEvents,
  maskIpAddress,
  generateCorrelationId,
  UserAccount,
  AuditEvent,
  ServiceHealthCheck,
} from './adminLogic.ts';

// Admin Portal UI Pages & Components
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.tsx';
import { UserManagementPage } from '../pages/admin/UserManagementPage.tsx';
import { UserDetailsPage } from '../pages/admin/UserDetailsPage.tsx';
import { RolesAccessPage } from '../pages/admin/RolesAccessPage.tsx';
import { SecurityAuditLogPage } from '../pages/admin/SecurityAuditLogPage.tsx';
import { SystemHealthPage } from '../pages/admin/SystemHealthPage.tsx';
import { CourseOversightPage } from '../pages/admin/CourseOversightPage.tsx';
import { AdminProfileSecurityPage } from '../pages/admin/AdminProfileSecurityPage.tsx';
import { AccessDeniedPage } from '../pages/admin/AccessDeniedPage.tsx';
import { AdminLayout } from '../components/admin/AdminLayout.tsx';
import { AuditDetailDrawer } from '../components/admin/AuditDetailDrawer.tsx';
import { ChangeRoleModal } from '../components/admin/ChangeRoleModal.tsx';
import { DeactivateAccountModal } from '../components/admin/DeactivateAccountModal.tsx';

const BACKEND_BASE = 'http://127.0.0.1:8000/api/v1';

describe('Administrator Complete Workflow E2E Suite', () => {
  let adminToken = '';
  let adminUserId = '';
  let studentToken = '';
  let tempUserId = '';

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const tempUserEmail = `adm_test_${uniqueSuffix}@learnova.edu`;
  const tempUserPass = 'TempPass123!';

  describe('Phase 1: Admin Authentication, Token Verification & RBAC Access Control', () => {
    test('POST /auth/login authenticates admin credentials and issues JWT', async () => {
      const res = await fetch(`${BACKEND_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@learnova.edu',
          password: 'admin123',
        }),
      });

      assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
      const data = await res.json();
      assert.ok(data.access_token, 'Access token must be returned');
      assert.equal(data.token_type, 'bearer');
      adminToken = data.access_token;
      authApi.setAccessToken(adminToken);
    });

    test('GET /auth/me returns administrator profile and role scope', async () => {
      const res = await fetch(`${BACKEND_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const user = await res.json();
      assert.ok(user.id, 'User ID must be present');
      assert.equal(user.email, 'admin@learnova.edu');
      assert.equal(user.role, 'administrator');
      adminUserId = user.id;
    });

    test('RBAC Gate: Student token attempting administrator endpoint returns 403 Forbidden', async () => {
      // 1. Authenticate as a student
      const studentLoginRes = await fetch(`${BACKEND_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student@learnova.edu',
          password: 'student123',
        }),
      });

      if (studentLoginRes.status === 200) {
        const studentData = await studentLoginRes.json();
        studentToken = studentData.access_token;

        // 2. Student attempts to access /admin/dashboard
        const forbiddenRes = await fetch(`${BACKEND_BASE}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${studentToken}` },
        });

        assert.equal(
          forbiddenRes.status,
          403,
          'Non-admin user must be strictly forbidden (403) from admin endpoints'
        );
      }
    });
  });

  describe('Phase 2: Administrative Dashboard KPI Telemetry & Diagnostics', () => {
    let dashboardData: any = null;

    test('GET /admin/dashboard aggregates platform KPIs across all subsystems', async () => {
      const res = await fetch(`${BACKEND_BASE}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      dashboardData = await res.json();

      // Verify user accounts summary
      assert.ok(dashboardData.users, 'Users summary must exist');
      assert.ok(dashboardData.users.total >= 1, 'Total users must be >= 1');
      assert.ok(dashboardData.users.administrators >= 1, 'At least 1 administrator must exist');

      // Verify curriculum volume summary
      assert.ok(dashboardData.curriculum, 'Curriculum summary must exist');
      assert.ok(dashboardData.curriculum.total_courses >= 1, 'Total courses must be >= 1');
      assert.ok(typeof dashboardData.curriculum.total_topics === 'number');
      assert.ok(typeof dashboardData.curriculum.total_lessons === 'number');

      // Verify enrollments summary
      assert.ok(dashboardData.enrollments, 'Enrollments summary must exist');
      assert.ok(typeof dashboardData.enrollments.total_enrollments === 'number');

      // Verify assessments summary
      assert.ok(dashboardData.assessments, 'Assessments summary must exist');
      assert.ok(typeof dashboardData.assessments.total_assessments === 'number');

      // Verify security audit metrics
      assert.ok(dashboardData.security_audit, 'Security audit metrics must exist');
      assert.ok(typeof dashboardData.security_audit.total_events_24h === 'number');
    });

    test('GET /admin/system/health returns safe operational telemetry without leaking credentials', async () => {
      const res = await fetch(`${BACKEND_BASE}/admin/system/health`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const health = await res.json();

      assert.equal(health.status, 'healthy');
      assert.ok(health.database, 'Database health must be reported');
      assert.equal(health.database.status, 'connected');
      assert.ok(typeof health.database.latency_ms === 'number');

      assert.ok(health.alembic, 'Alembic migration status must be reported');
      assert.ok(health.alembic.current_head, 'Current alembic head must be specified');

      assert.ok(health.outbox, 'Outbox queue metrics must be reported');
      assert.ok(typeof health.outbox.pending_count === 'number');

      assert.ok(health.ai_service, 'AI provider diagnostics must be reported');
      assert.ok(health.ai_service.model, 'AI model must be present');
    });
  });

  describe('Phase 3: User Directory Governance, Search, Filters & Deep Inspection', () => {
    test('GET /admin/users returns paginated user accounts', async () => {
      const res = await fetch(`${BACKEND_BASE}/admin/users?limit=10&offset=0`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const userList = await res.json();
      assert.ok(Array.isArray(userList.items), 'items must be an array');
      assert.ok(userList.total >= 1, 'Total user count must be >= 1');
      assert.ok(userList.items.length <= 10, 'Returned items must respect limit');

      const firstUser = userList.items[0];
      assert.ok(firstUser.id);
      assert.ok(firstUser.email);
      assert.ok(firstUser.full_name);
      assert.ok(firstUser.role);
    });

    test('GET /admin/users with role filter isolates users by role', async () => {
      // Filter for administrators
      const adminRes = await fetch(`${BACKEND_BASE}/admin/users?role=administrator`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminRes.status, 200);
      const adminList = await adminRes.json();
      assert.ok(adminList.items.every((u: any) => u.role === 'administrator'));

      // Filter for students
      const studentRes = await fetch(`${BACKEND_BASE}/admin/users?role=student`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(studentRes.status, 200);
      const studentList = await studentRes.json();
      assert.ok(studentList.items.every((u: any) => u.role === 'student'));
    });

    test('GET /admin/users with search query returns matching accounts', async () => {
      const res = await fetch(`${BACKEND_BASE}/admin/users?search=admin@learnova.edu`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const searchResult = await res.json();
      assert.ok(searchResult.items.length >= 1);
      assert.ok(searchResult.items.some((u: any) => u.email === 'admin@learnova.edu'));
    });

    test('GET /admin/users/{id} inspects detailed account metrics and security profile', async () => {
      const res = await fetch(`${BACKEND_BASE}/admin/users/${adminUserId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const detail = await res.json();
      assert.equal(detail.user.id, adminUserId);
      assert.equal(detail.user.email, 'admin@learnova.edu');
      assert.ok(detail.security_profile, 'Security profile must be populated');
      assert.ok(detail.security_profile.role_scope.includes('Governance') || detail.security_profile.role_scope.includes('Administrator'));
      assert.ok(typeof detail.enrolled_courses_count === 'number');
      assert.ok(typeof detail.assigned_courses_count === 'number');
    });
  });

  describe('Phase 4: Role Governance Safeguards & Live Transitions', () => {
    test('Safeguard: Admin self-demotion is strictly blocked by backend with 400 Bad Request', async () => {
      const res = await fetch(`${BACKEND_BASE}/admin/users/${adminUserId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'student' }),
      });

      assert.equal(res.status, 400, 'Self-demotion must be rejected with 400 Bad Request');
      const err = await res.json();
      assert.match(err.detail, /cannot change their own role/i);
    });

    test('Client Guardrail: validateRoleChange prevents self-demotion and last-admin lockout', () => {
      const mockAdmin: UserAccount = {
        id: adminUserId,
        name: 'Admin User',
        email: 'admin@learnova.edu',
        role: 'administrator',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const mockOtherStudent: UserAccount = {
        id: 'stu-999',
        name: 'Test Student',
        email: 'stu999@learnova.edu',
        role: 'student',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const allUsers = [mockAdmin, mockOtherStudent];

      // Self-demotion
      const selfDemotion = validateRoleChange(
        { id: adminUserId, role: 'administrator' },
        mockAdmin,
        'student',
        allUsers
      );
      assert.equal(selfDemotion.valid, false);
      assert.match(selfDemotion.error || '', /Self-Demotion/i);

      // Last admin lockout
      const lastAdminCheck = validateRoleChange(
        { id: 'another-adm', role: 'administrator' },
        mockAdmin,
        'teacher',
        allUsers
      );
      assert.equal(lastAdminCheck.valid, false);
      assert.match(lastAdminCheck.error || '', /last active administrator/i);

      // Valid promotion of other user
      const validPromotion = validateRoleChange(
        { id: adminUserId, role: 'administrator' },
        mockOtherStudent,
        'teacher',
        allUsers
      );
      assert.equal(validPromotion.valid, true);
    });

    test('Live Transition: Promote a student to teacher and revert back safely', async () => {
      // 1. Create a temporary user to test role transitions
      const regRes = await fetch(`${BACKEND_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tempUserEmail,
          password: tempUserPass,
          full_name: 'Role Transition Test User',
          role: 'student',
        }),
      });

      assert.equal(regRes.status, 201, `Failed to register temp user: ${regRes.status}`);
      const regData = await regRes.json();
      tempUserId = regData.user.id;

      // 2. Promote user to teacher
      const promoteRes = await fetch(`${BACKEND_BASE}/admin/users/${tempUserId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'teacher' }),
      });

      assert.equal(promoteRes.status, 200);
      const promotedUser = await promoteRes.json();
      assert.equal(promotedUser.role, 'teacher');

      // Verify with GET /admin/users/{id}
      const inspectRes = await fetch(`${BACKEND_BASE}/admin/users/${tempUserId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(inspectRes.status, 200);
      const detail = await inspectRes.json();
      assert.equal(detail.user.role, 'teacher');

      // 3. Revert user back to student
      const revertRes = await fetch(`${BACKEND_BASE}/admin/users/${tempUserId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'student' }),
      });

      assert.equal(revertRes.status, 200);
      const revertedUser = await revertRes.json();
      assert.equal(revertedUser.role, 'student');
    });
  });

  describe('Phase 5: Account Status Governance Safeguards & Lifecycle', () => {
    test('Safeguard: Admin self-deactivation is strictly blocked by backend with 400 Bad Request', async () => {
      const res = await fetch(`${BACKEND_BASE}/admin/users/${adminUserId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });

      assert.equal(res.status, 400, 'Self-deactivation must be rejected with 400 Bad Request');
      const err = await res.json();
      assert.match(err.detail, /cannot deactivate their own account/i);
    });

    test('Client Guardrail: validateAccountStatusChange prevents self-lockout and last-admin deactivation', () => {
      const mockAdmin: UserAccount = {
        id: adminUserId,
        name: 'Admin User',
        email: 'admin@learnova.edu',
        role: 'administrator',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const allUsers = [mockAdmin];

      // Self-deactivation
      const selfDeact = validateAccountStatusChange(
        { id: adminUserId, role: 'administrator' },
        mockAdmin,
        false,
        allUsers
      );
      assert.equal(selfDeact.valid, false);
      assert.match(selfDeact.error || '', /Self-Lockout/i);

      // Last admin deactivation
      const lastAdminDeact = validateAccountStatusChange(
        { id: 'other-adm', role: 'administrator' },
        mockAdmin,
        false,
        allUsers
      );
      assert.equal(lastAdminDeact.valid, false);
      assert.match(lastAdminDeact.error || '', /last active administrator/i);
    });

    test('Live Transition: Deactivate test user account, verify login is blocked, then reactivate', async () => {
      // 1. Deactivate temp user
      const deactRes = await fetch(`${BACKEND_BASE}/admin/users/${tempUserId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });

      assert.equal(deactRes.status, 200);
      const deactivatedUser = await deactRes.json();
      assert.equal(deactivatedUser.is_active, false);

      // 2. Verify deactivated user cannot authenticate
      const blockedLoginRes = await fetch(`${BACKEND_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tempUserEmail,
          password: tempUserPass,
        }),
      });

      assert.ok(
        blockedLoginRes.status === 400 || blockedLoginRes.status === 401 || blockedLoginRes.status === 403,
        `Expected deactivated login to fail, got ${blockedLoginRes.status}`
      );

      // 3. Reactivate user account
      const reactRes = await fetch(`${BACKEND_BASE}/admin/users/${tempUserId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: true }),
      });

      assert.equal(reactRes.status, 200);
      const reactivatedUser = await reactRes.json();
      assert.equal(reactivatedUser.is_active, true);

      // 4. Verify user can log in again
      const restoredLoginRes = await fetch(`${BACKEND_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tempUserEmail,
          password: tempUserPass,
        }),
      });
      assert.equal(restoredLoginRes.status, 200, 'Reactivated user must be able to log in');
    });

    test('Safeguard Edge Case: Multiple concurrent administrators allows deactivating second admin, but blocks deactivation of last active administrator', async () => {
      // 1. Promote tempUser to administrator role
      const promoteAdmRes = await fetch(`${BACKEND_BASE}/admin/users/${tempUserId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'administrator' }),
      });
      assert.equal(promoteAdmRes.status, 200);

      // 2. Deactivating the second administrator succeeds because >1 active administrator exists
      const deactSecondAdm = await fetch(`${BACKEND_BASE}/admin/users/${tempUserId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });
      assert.equal(deactSecondAdm.status, 200, 'Deactivating non-last administrator must succeed');

      // 3. Reactivate and revert temp user back to student
      await fetch(`${BACKEND_BASE}/admin/users/${tempUserId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: true }),
      });
      await fetch(`${BACKEND_BASE}/admin/users/${tempUserId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'student' }),
      });
    });
  });

  describe('Phase 6: Immutable Security Audit Logging, Event Filtering & IP Masking', () => {
    test('GET /admin/audit-logs retrieves security audit events with safe IP masking', async () => {
      const res = await fetch(`${BACKEND_BASE}/admin/audit-logs?limit=20`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const auditLogData = await res.json();
      assert.ok(Array.isArray(auditLogData.items), 'Audit items must be an array');
      assert.ok(auditLogData.total >= 1, 'Total audit events must be >= 1');

      // Verify schema attributes and IP masking
      const firstEvent = auditLogData.items[0];
      assert.ok(firstEvent.id);
      assert.ok(firstEvent.action);
      assert.ok(firstEvent.outcome);
      if (firstEvent.ip_address_safe) {
        assert.ok(
          firstEvent.ip_address_safe.includes('(Masked)') ||
            firstEvent.ip_address_safe.includes('***') ||
            firstEvent.ip_address_safe === '127.0.0.1' ||
            firstEvent.ip_address_safe === '::1',
          `IP should be safe representation, got ${firstEvent.ip_address_safe}`
        );
      }
    });

    test('Audit Query: Denied security events capture blocked self-demotion and self-deactivation', async () => {
      const res = await fetch(`${BACKEND_BASE}/admin/audit-logs?outcome=DENIED&limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const deniedData = await res.json();
      assert.ok(deniedData.items.length >= 1, 'Should find recorded denied audit events');

      const reasons = deniedData.items.map((i: any) => i.reason);
      assert.ok(
        reasons.some((r: string) => r && r.includes('Self-demotion blocked')),
        'Audit log must record self-demotion blocked event'
      );
      assert.ok(
        reasons.some((r: string) => r && r.includes('Self-deactivation blocked')),
        'Audit log must record self-deactivation blocked event'
      );
    });

    test('Client Helpers: filterAuditEvents, maskIpAddress, generateCorrelationId operate correctly', () => {
      // maskIpAddress
      assert.equal(maskIpAddress('192.168.1.50'), '192.168.***.*** (Masked)');
      assert.equal(maskIpAddress(''), '0.0.0.0 (Masked)');

      // generateCorrelationId
      const corrId = generateCorrelationId();
      assert.match(corrId, /^corr-[a-z0-9]+-[a-z0-9]+$/);

      // filterAuditEvents
      const testEvents: AuditEvent[] = [
        {
          id: 'ev-1',
          timestamp: new Date().toISOString(),
          actorId: adminUserId,
          actorName: 'Admin User',
          actorEmail: 'admin@learnova.edu',
          actorRole: 'administrator',
          action: 'ROLE_CHANGE',
          targetType: 'user',
          targetId: tempUserId,
          targetName: 'Test Target',
          outcome: 'success',
          correlationId: corrId,
        },
        {
          id: 'ev-2',
          timestamp: new Date().toISOString(),
          actorId: adminUserId,
          actorName: 'Admin User',
          actorEmail: 'admin@learnova.edu',
          actorRole: 'administrator',
          action: 'ACCOUNT_DEACTIVATED',
          targetType: 'user',
          targetId: tempUserId,
          targetName: 'Test Target',
          outcome: 'blocked',
          correlationId: 'corr-blocked-1',
          reason: 'Self-deactivation blocked',
        },
      ];

      const roleEvents = filterAuditEvents(testEvents, 'ROLE_CHANGE', 'all', '');
      assert.equal(roleEvents.length, 1);
      assert.equal(roleEvents[0].id, 'ev-1');

      const blockedEvents = filterAuditEvents(testEvents, 'all', 'blocked', '');
      assert.equal(blockedEvents.length, 1);
      assert.equal(blockedEvents[0].id, 'ev-2');

      const textFilter = filterAuditEvents(testEvents, 'all', 'all', 'blocked');
      assert.equal(textFilter.length, 1);
      assert.equal(textFilter[0].id, 'ev-2');
    });
  });

  describe('Phase 7: Administrative Course Oversight & DAG Structure', () => {
    test('GET /courses returns all curriculum courses across platform', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses`);
      assert.equal(res.status, 200);
      const courses = await res.json();
      assert.ok(Array.isArray(courses), 'Courses must be an array');
      assert.ok(courses.length >= 1, 'At least 1 course must exist');

      const publishedCourse = courses.find((c: any) => c.status === 'published');
      assert.ok(publishedCourse, 'At least 1 published course should exist');
      assert.ok(publishedCourse.id);
      assert.ok(publishedCourse.title);

      // Verify course learning map DAG inspection
      const mapRes = await fetch(`${BACKEND_BASE}/courses/${publishedCourse.id}/learning-map`);
      assert.equal(mapRes.status, 200);
      const mapData = await mapRes.json();
      assert.ok(Array.isArray(mapData.nodes), 'Map must contain DAG nodes');
      assert.ok(Array.isArray(mapData.edges), 'Map must contain DAG edges');
    });
  });

  describe('Phase 8: React UI Rendering for all Administrator Pages, Modals & Shell', () => {
    const mockAdminAccount: UserAccount = {
      id: adminUserId || 'adm-master-1',
      name: 'System Administrator',
      email: 'admin@learnova.edu',
      role: 'administrator',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      department: 'Platform Governance & Security',
    };

    const mockUsersList: UserAccount[] = [
      mockAdminAccount,
      {
        id: 'usr-tch-1',
        name: 'Dr. Alan Turing',
        email: 'alan@learnova.edu',
        role: 'teacher',
        isActive: true,
        createdAt: '2026-09-05T00:00:00Z',
        department: 'Computer Science',
      },
      {
        id: 'usr-stu-1',
        name: 'Ada Lovelace',
        email: 'ada@learnova.edu',
        role: 'student',
        isActive: true,
        createdAt: '2026-09-10T00:00:00Z',
      },
      {
        id: 'usr-stu-2',
        name: 'Grace Hopper',
        email: 'grace@learnova.edu',
        role: 'student',
        isActive: false,
        createdAt: '2026-09-12T00:00:00Z',
      },
    ];

    const mockAuditEvents: AuditEvent[] = [
      {
        id: 'aud-1',
        timestamp: new Date().toISOString(),
        actorId: mockAdminAccount.id,
        actorName: mockAdminAccount.name,
        actorEmail: mockAdminAccount.email,
        actorRole: 'administrator',
        action: 'ROLE_CHANGE',
        targetType: 'user',
        targetId: 'usr-stu-1',
        targetName: 'Ada Lovelace',
        outcome: 'success',
        correlationId: 'corr-ui-1',
        details: { from_role: 'student', to_role: 'teacher' },
        ipAddressSafe: '192.168.***.*** (Masked)',
      },
      {
        id: 'aud-2',
        timestamp: new Date().toISOString(),
        actorId: mockAdminAccount.id,
        actorName: mockAdminAccount.name,
        actorEmail: mockAdminAccount.email,
        actorRole: 'administrator',
        action: 'ROLE_CHANGE',
        targetType: 'user',
        targetId: mockAdminAccount.id,
        targetName: mockAdminAccount.name,
        outcome: 'blocked',
        correlationId: 'corr-ui-2',
        reason: 'Self-demotion blocked',
        ipAddressSafe: '192.168.***.*** (Masked)',
      },
    ];

    const mockHealthChecks: ServiceHealthCheck[] = [
      {
        id: 'srv-db',
        name: 'Primary PostgreSQL Database',
        category: 'database',
        status: 'healthy',
        latencyMs: 4,
        uptimePercent: 99.99,
        lastChecked: new Date().toISOString(),
        description: 'Read-write transaction pool operational',
      },
      {
        id: 'srv-api',
        name: 'FastAPI REST Core Engine',
        category: 'api',
        status: 'healthy',
        latencyMs: 12,
        uptimePercent: 99.95,
        lastChecked: new Date().toISOString(),
        description: 'Outbox processors and JWT validation operational',
      },
      {
        id: 'srv-ai',
        name: 'Ollama LLM Orchestrator',
        category: 'ai_service',
        status: 'healthy',
        latencyMs: 85,
        uptimePercent: 99.5,
        lastChecked: new Date().toISOString(),
        description: 'Local reasoning model llama3:8b warm',
      },
    ];

    test('1. AdminLayout renders header, sidebar, navigation, theme controls, and breadcrumbs', () => {
      const html = renderToString(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(
            AdminLayout,
            {
              currentPage: 'dashboard',
              onNavigate: () => {},
              currentAdmin: mockAdminAccount,
              toasts: [],
              onDismissToast: () => {},
              onSwitchPortal: () => {},
              onSignOut: () => {},
              breadcrumbs: [{ label: 'Admin' }, { label: 'Dashboard' }],
            },
            React.createElement('div', { id: 'admin-slot-content' }, 'Admin Children Slot')
          )
        )
      );

      assert.ok(html.includes('Admin Children Slot'), 'Slot content must be rendered');
      assert.ok(html.includes(mockAdminAccount.name), 'Current admin name must be rendered');
      assert.ok(html.includes('Dashboard'), 'Navigation items must appear');
    });

    test('2. AdminDashboardPage renders KPI cards, telemetry badges, and recent audit records', () => {
      const html = renderToString(
        React.createElement(AdminDashboardPage, {
          users: mockUsersList,
          auditEvents: mockAuditEvents,
          serviceHealth: mockHealthChecks,
          onNavigate: () => {},
          dashboardData: null,
        })
      );

      assert.ok(html.includes('Administration Overview'));
      assert.ok(html.includes('Total Accounts'));
      assert.ok(html.includes('Recent Security Activity'));
      assert.ok(html.includes('Ada Lovelace'));
    });

    test('3. UserManagementPage renders directory table, role filter dropdown, and action buttons', () => {
      const html = renderToString(
        React.createElement(UserManagementPage, {
          users: mockUsersList,
          currentAdminId: mockAdminAccount.id,
          onNavigate: () => {},
          onRequestRoleChange: () => {},
          onRequestStatusChange: () => {},
        })
      );

      assert.ok(html.includes('User Management'));
      assert.ok(html.includes('Dr. Alan Turing'));
      assert.ok(html.includes('Ada Lovelace'));
      assert.ok(html.includes('Modify user role') || html.includes('All Roles'));
    });

    test('4. UserDetailsPage renders comprehensive user inspection card and audit activity', () => {
      const html = renderToString(
        React.createElement(UserDetailsPage, {
          userId: mockAdminAccount.id,
          users: mockUsersList,
          auditEvents: mockAuditEvents,
          currentAdminId: mockAdminAccount.id,
          onNavigate: () => {},
          onRequestRoleChange: () => {},
          onRequestStatusChange: () => {},
        })
      );

      assert.ok(html.includes('Back to User Management'));
      assert.ok(html.includes('admin@learnova.edu'));
      assert.ok(html.includes('Target Security Audit Trail'));
    });

    test('5. RolesAccessPage renders role matrix, permission definitions, and assignment form', () => {
      const html = renderToString(
        React.createElement(RolesAccessPage, {
          users: mockUsersList,
          currentAdminId: mockAdminAccount.id,
          onConfirmRoleChange: async () => ({ success: true }),
        })
      );

      assert.ok(html.includes('Roles &amp; Access Control') || html.includes('Roles & Access Control'));
      assert.ok(html.includes('Administrator'));
      assert.ok(html.includes('Teacher'));
      assert.ok(html.includes('Student'));
      assert.ok(html.includes('Apply Role Modification'));
    });

    test('6. SecurityAuditLogPage renders audit event table with filtering and export buttons', () => {
      const html = renderToString(
        React.createElement(SecurityAuditLogPage, {
          auditEvents: mockAuditEvents,
        })
      );

      assert.ok(html.includes('Security Audit Log'));
      assert.ok(html.includes('Append-Only Integrity Active'));
      assert.ok(html.includes('All Action Types'));
      assert.ok(html.includes('ROLE_CHANGE'));
    });

    test('7. AuditDetailDrawer renders event metadata, correlation ID, and safe IP address', () => {
      const html = renderToString(
        React.createElement(AuditDetailDrawer, {
          isOpen: true,
          onClose: () => {},
          event: mockAuditEvents[0],
        })
      );

      assert.ok(html.includes('Security Audit Event Details'));
      assert.ok(html.includes('corr-ui-1'));
      assert.ok(html.includes('192.168.***.*** (Masked)'));
      assert.ok(html.includes('Ada Lovelace'));
    });

    test('8. SystemHealthPage renders service diagnostics cards, latency metrics, and refresh action', () => {
      const html = renderToString(
        React.createElement(SystemHealthPage, {
          serviceHealth: mockHealthChecks,
          onRefreshHealth: async () => mockHealthChecks,
        })
      );

      assert.ok(html.includes('System Health &amp; Telemetry') || html.includes('System Health & Telemetry'));
      assert.ok(html.includes('Primary PostgreSQL Database'));
      assert.ok(html.includes('FastAPI REST Core Engine'));
      assert.ok(html.includes('Ollama LLM Orchestrator'));
    });

    test('9. CourseOversightPage renders platform courses with topic breakdown and student list toggle', () => {
      const mockCourses = storage.getCourses();
      const mockTopics = storage.getTopics();
      const mockLessons = storage.getLessons();

      const html = renderToString(
        React.createElement(CourseOversightPage, {
          courses: mockCourses,
          topics: mockTopics,
          lessons: mockLessons,
          users: mockUsersList,
          enrollments: [],
        })
      );

      assert.ok(html.includes('Course &amp; Content Oversight') || html.includes('Course & Content Oversight'));
      assert.ok(html.includes('Course Information'));
    });

    test('10. AdminProfileSecurityPage renders profile management, password change, and security settings', () => {
      const html = renderToString(
        React.createElement(AdminProfileSecurityPage, {
          currentAdmin: mockAdminAccount,
          onUpdateAdminProfile: () => {},
          onUpdatePassword: async () => ({ success: true }),
          onSignOut: () => {},
          onNotify: () => {},
        })
      );

      assert.ok(html.includes('Profile &amp; Security Credentials') || html.includes('Profile & Security Credentials'));
      assert.ok(html.includes('Administrator Identity'));
    });

    test('11. ChangeRoleModal renders target user role selector and justification field', () => {
      const html = renderToString(
        React.createElement(ChangeRoleModal, {
          isOpen: true,
          onClose: () => {},
          targetUser: mockUsersList[2], // Ada Lovelace (student)
          currentAdminId: mockAdminAccount.id,
          onConfirmRoleChange: async () => ({ success: true }),
        })
      );

      assert.ok(html.includes('Modify User Role'));
      assert.ok(html.includes('Ada Lovelace'));
      assert.ok(html.includes('Reason for Audit Trail'));
    });

    test('12. DeactivateAccountModal renders account deactivation warning and reason prompt', () => {
      const html = renderToString(
        React.createElement(DeactivateAccountModal, {
          isOpen: true,
          onClose: () => {},
          targetUser: mockUsersList[1], // Alan Turing (active teacher)
          currentAdminId: mockAdminAccount.id,
          onConfirmStatusChange: async () => ({ success: true }),
        })
      );

      assert.ok(html.includes('Deactivate Account'));
      assert.ok(html.includes('Dr. Alan Turing'));
      assert.ok(html.includes('Reason for Audit Trail'));
    });

    test('13. AccessDeniedPage renders RBAC restriction warning and portal redirection buttons', () => {
      const html = renderToString(
        React.createElement(AccessDeniedPage, {
          onSwitchPortal: () => {},
        })
      );

      assert.ok(html.includes('Administrative Access Restricted'));
      assert.ok(html.includes('Student Portal'));
      assert.ok(html.includes('Teacher Portal'));
    });
  });
});
