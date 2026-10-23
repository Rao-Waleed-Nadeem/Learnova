export type UserRole = 'student' | 'teacher' | 'administrator';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastActiveAt?: string;
  avatar?: string;
  department?: string;
  enrolledCoursesCount?: number;
  assignedCoursesCount?: number;
}

export type AuditActionType =
  | 'ROLE_CHANGE'
  | 'ACCOUNT_DEACTIVATED'
  | 'ACCOUNT_ACTIVATED'
  | 'ADMIN_LOGIN'
  | 'SESSION_TERMINATED'
  | 'PASSWORD_CHANGED'
  | 'PERMISSION_OVERRIDE_ATTEMPT';

export type AuditOutcome = 'success' | 'failure' | 'blocked';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: UserRole;
  action: AuditActionType;
  targetType: 'user' | 'role' | 'system' | 'session';
  targetId: string;
  targetName: string;
  outcome: AuditOutcome;
  correlationId: string;
  reason?: string;
  details?: Record<string, any>;
  ipAddressSafe?: string;
}

export interface ServiceHealthCheck {
  id: string;
  name: string;
  category: 'api' | 'database' | 'auth' | 'ai_service' | 'cache' | 'worker';
  status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  latencyMs: number;
  uptimePercent: number;
  lastChecked: string;
  description: string;
  incidentNotes?: string;
}

/**
 * Validates role change requests with strict administrative guardrails:
 * 1. Actor must be an administrator
 * 2. Self-demotion is strictly prohibited (cannot remove own administrator role)
 * 3. Last active administrator lockout protection
 * 4. Target role must be valid enum
 */
export function validateRoleChange(
  actor: { id: string; role: UserRole },
  target: UserAccount,
  newRole: UserRole,
  allUsers: UserAccount[]
): { valid: boolean; error?: string } {
  if (actor.role !== 'administrator') {
    return { valid: false, error: 'Unauthorized: Only administrators can modify user roles.' };
  }

  if (target.role === newRole) {
    return { valid: false, error: `User is already assigned the "${newRole}" role.` };
  }

  // Prevent self-demotion
  if (actor.id === target.id && target.role === 'administrator' && newRole !== 'administrator') {
    return {
      valid: false,
      error: 'Self-Demotion Guardrail: You cannot revoke your own administrator privileges.',
    };
  }

  // Last administrator lockout prevention
  if (target.role === 'administrator' && newRole !== 'administrator') {
    const activeAdmins = allUsers.filter((u) => u.role === 'administrator' && u.isActive);
    if (activeAdmins.length <= 1) {
      return {
        valid: false,
        error: 'Lockout Prevention: Cannot demote the platform’s last active administrator.',
      };
    }
  }

  return { valid: true };
}

/**
 * Validates account deactivation/activation requests:
 * 1. Actor must be an administrator
 * 2. Cannot deactivate own account while logged in
 * 3. Cannot deactivate the last active administrator
 */
export function validateAccountStatusChange(
  actor: { id: string; role: UserRole },
  target: UserAccount,
  nextActiveState: boolean,
  allUsers: UserAccount[]
): { valid: boolean; error?: string } {
  if (actor.role !== 'administrator') {
    return { valid: false, error: 'Unauthorized: Only administrators can modify account status.' };
  }

  if (target.isActive === nextActiveState) {
    return {
      valid: false,
      error: `Account is already ${nextActiveState ? 'active' : 'inactive'}.`,
    };
  }

  // Prevent self-deactivation
  if (actor.id === target.id && !nextActiveState) {
    return {
      valid: false,
      error: 'Self-Lockout Guardrail: You cannot deactivate your currently authenticated administrator account.',
    };
  }

  // Last administrator lockout prevention
  if (target.role === 'administrator' && !nextActiveState) {
    const activeAdmins = allUsers.filter((u) => u.role === 'administrator' && u.isActive);
    if (activeAdmins.length <= 1) {
      return {
        valid: false,
        error: 'Lockout Prevention: Cannot deactivate the platform’s last active administrator.',
      };
    }
  }

  return { valid: true };
}

/**
 * Filters and sorts users safely with pagination support
 */
export function filterUsers(
  users: UserAccount[],
  searchQuery: string,
  roleFilter: string,
  statusFilter: string,
  sortBy: string = 'name_asc'
): UserAccount[] {
  const q = searchQuery.trim().toLowerCase();

  return users
    .filter((user) => {
      // Search matching name or email
      if (q) {
        const matchesName = user.name.toLowerCase().includes(q);
        const matchesEmail = user.email.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }

      // Role filter
      if (roleFilter && roleFilter !== 'all') {
        if (user.role !== roleFilter) return false;
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        const expectedActive = statusFilter === 'active';
        if (user.isActive !== expectedActive) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'role':
          return a.role.localeCompare(b.role);
        case 'created_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'created_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });
}

/**
 * Filters audit events by action, outcome, and text search
 */
export function filterAuditEvents(
  events: AuditEvent[],
  actionFilter: string,
  outcomeFilter: string,
  searchQuery: string
): AuditEvent[] {
  const q = searchQuery.trim().toLowerCase();

  return events.filter((ev) => {
    if (actionFilter && actionFilter !== 'all' && ev.action !== actionFilter) {
      return false;
    }

    if (outcomeFilter && outcomeFilter !== 'all' && ev.outcome !== outcomeFilter) {
      return false;
    }

    if (q) {
      const matchActor = ev.actorName.toLowerCase().includes(q) || ev.actorEmail.toLowerCase().includes(q);
      const matchTarget = ev.targetName.toLowerCase().includes(q) || ev.targetId.toLowerCase().includes(q);
      const matchCorrelation = ev.correlationId.toLowerCase().includes(q);
      const matchReason = ev.reason ? ev.reason.toLowerCase().includes(q) : false;
      if (!matchActor && !matchTarget && !matchCorrelation && !matchReason) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Mask an IP address to preserve privacy while providing correlation
 */
export function maskIpAddress(ip: string): string {
  if (!ip) return '0.0.0.0 (Masked)';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.*** (Masked)`;
  }
  return ip.substring(0, 6) + '*** (Masked)';
}

/**
 * Generate a random correlation ID for audit events
 */
export function generateCorrelationId(): string {
  return 'corr-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
}
