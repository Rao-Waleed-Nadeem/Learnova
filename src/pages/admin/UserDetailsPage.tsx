import React from 'react';
import {
  ArrowLeft,
  Shield,
  User,
  Clock,
  Mail,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Lock,
  Layers,
  History,
  CheckCircle2,
} from 'lucide-react';
import { UserAccount, AuditEvent } from '../../types';
import { RoleBadge } from '../../components/admin/RoleBadge';
import { AdminNavigationPage } from '../../components/admin/AdminLayout';

interface UserDetailsPageProps {
  userId: string;
  users: UserAccount[];
  auditEvents: AuditEvent[];
  currentAdminId: string;
  onNavigate: (page: AdminNavigationPage, params?: Record<string, string>) => void;
  onRequestRoleChange: (user: UserAccount) => void;
  onRequestStatusChange: (user: UserAccount) => void;
}

export const UserDetailsPage: React.FC<UserDetailsPageProps> = ({
  userId,
  users,
  auditEvents,
  currentAdminId,
  onNavigate,
  onRequestRoleChange,
  onRequestStatusChange,
}) => {
  const user = users.find((u) => u.id === userId) || users[0];

  if (!user) {
    return (
      <div className="p-12 text-center bg-white dark:bg-[#181C24] rounded-2xl border border-gray-200 dark:border-gray-800">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">User Account Not Found</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The requested account record could not be loaded.</p>
        <button
          type="button"
          onClick={() => onNavigate('users')}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700"
        >
          Return to User List
        </button>
      </div>
    );
  }

  const isSelf = user.id === currentAdminId;

  // Filter audit records specific to this user
  const userAuditEvents = auditEvents.filter(
    (e) => e.targetId === user.id || e.actorId === user.id
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <button
          type="button"
          onClick={() => onNavigate('users')}
          className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to User Management</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRequestRoleChange(user)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition cursor-pointer"
          >
            Change Role
          </button>
          <button
            type="button"
            onClick={() => onRequestStatusChange(user)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer ${
              user.isActive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {user.isActive ? 'Deactivate Account' : 'Reactivate Account'}
          </button>
        </div>
      </div>

      {/* User Header Profile Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
            {user.avatar || user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {user.name}
              </h1>
              {isSelf && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
                  Your Account
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span>{user.email}</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <RoleBadge role={user.role} size="sm" />
              {user.isActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Account Identifier */}
        <div className="sm:text-right p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/70 dark:border-gray-800">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Account ID</p>
          <p className="text-xs font-mono font-bold text-gray-900 dark:text-white">{user.id}</p>
        </div>
      </div>

      {/* Grid: Account Information & Access Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Information */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
            <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Account Specifications</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-400 mb-0.5">Registration Date</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Last Platform Activity</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Department / Faculty</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {user.department || 'General Learning'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">
                {user.role === 'teacher' ? 'Assigned Courses' : 'Enrolled Courses'}
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {user.role === 'teacher'
                  ? `${user.assignedCoursesCount || 1} course(s)`
                  : `${user.enrolledCoursesCount || 1} course(s)`}
              </p>
            </div>
          </div>
        </div>

        {/* Access Profile & Security Constraints */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Access Profile & Security (SRS §3.2.9)</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
              <p className="font-bold text-purple-900 dark:text-purple-300">
                Assigned Role: <span className="capitalize">{user.role}</span>
              </p>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1">
                {user.role === 'administrator' &&
                  'Full authorization: Account governance, role assignments, audit log review, and platform health telemetry.'}
                {user.role === 'teacher' &&
                  'Faculty authorization: Curriculum authoring, question bank creation, assessment scheduling, and student performance review.'}
                {user.role === 'student' &&
                  'Learner authorization: Interactive lesson workspace, diagnostic baselines, adaptive practice, and gamification rewards.'}
              </p>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 text-[11px]">
              <span className="text-gray-500">Authentication Method:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">bcrypt Hashing + JWT</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 text-[11px]">
              <span className="text-gray-500">Access Scope:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Server-Side Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target User Security Audit History */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Target Security Audit Trail
            </h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {userAuditEvents.length} recorded events
          </span>
        </div>

        {userAuditEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No administrative or security events recorded for this user account.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {userAuditEvents.map((ev) => (
              <div key={ev.id} className="py-3 flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                      {ev.action}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        ev.outcome === 'success'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {ev.outcome.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Actor: <span className="font-semibold">{ev.actorName}</span> • Reason: "{ev.reason || 'N/A'}"
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[11px] text-gray-500">
                    {new Date(ev.timestamp).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-gray-400">{ev.correlationId}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
