import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  BookOpen,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  Info,
  UserCheck,
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import { RoleBadge } from '../../components/admin/RoleBadge';
import { validateRoleChange } from '../../utils/adminLogic';

interface RolesAccessPageProps {
  users: UserAccount[];
  currentAdminId: string;
  onConfirmRoleChange: (targetUserId: string, newRole: UserRole, reason: string) => Promise<{ success: boolean; error?: string }>;
}

export const RolesAccessPage: React.FC<RolesAccessPageProps> = ({
  users,
  currentAdminId,
  onConfirmRoleChange,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [targetRole, setTargetRole] = useState<UserRole>('teacher');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];
  const isSelf = selectedUser?.id === currentAdminId;
  const isSameRole = selectedUser?.role === targetRole;

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!selectedUser) return;

    if (isSameRole) {
      setStatusMessage({ type: 'error', text: `User is already assigned the "${targetRole}" role.` });
      return;
    }

    if (!reason.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide an administrative reason for the audit log.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onConfirmRoleChange(selectedUser.id, targetRole, reason.trim());
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully updated ${selectedUser.name}'s role to ${targetRole}. Security audit log entry created.`,
        });
        setReason('');
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to update role.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Roles & Access Control (RBAC)
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review fixed Learnova actor roles and execute policy-governed role assignments (SRS §3.2.9)
        </p>
      </div>

      {/* Role Architecture Cards (3 Fixed Roles) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Student Role */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Student</h3>
              <RoleBadge role="student" size="sm" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Learner persona engaged in sequential and adaptive study
            </p>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Enrolls in approved courses & tracks progress</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Takes diagnostic, adaptive, & final assessments</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Earns gamification XP, levels & achievement badges</span>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
            Current Members: <span className="font-bold text-gray-900 dark:text-white">{users.filter((u) => u.role === 'student').length}</span>
          </div>
        </div>

        {/* Teacher Role */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Teacher</h3>
              <RoleBadge role="teacher" size="sm" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Faculty persona with course authoring & analytics authority
            </p>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Authors curriculum units, topics, & DAG prerequisites</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Creates question banks & reviews AI candidate questions</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Configures exams & monitors classroom performance</span>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
            Current Members: <span className="font-bold text-gray-900 dark:text-white">{users.filter((u) => u.role === 'teacher').length}</span>
          </div>
        </div>

        {/* Administrator Role */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Administrator</h3>
              <RoleBadge role="administrator" size="sm" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Platform governance & security audit oversight persona
            </p>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>User account governance & account lifecycle management</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>RBAC role assignment with immutable security audit logging</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Monitors service health, API adapters, & telemetry</span>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
            Current Members: <span className="font-bold text-gray-900 dark:text-white">{users.filter((u) => u.role === 'administrator').length}</span>
          </div>
        </div>
      </div>

      {/* Role Assignment Workflow Form */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-6">
        <div className="pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Assign & Update User Role
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Select an account, designate a target role, and document the administrative rationale
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
            Audited Action
          </span>
        </div>

        <form onSubmit={handleAssignRole} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* User Selector */}
            <div>
              <label htmlFor="user-picker" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Select Target Account <span className="text-rose-500">*</span>
              </label>
              <select
                id="user-picker"
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setStatusMessage(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) — Current: {u.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Role Selector */}
            <div>
              <label htmlFor="new-role-select" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Designate New Role <span className="text-rose-500">*</span>
              </label>
              <select
                id="new-role-select"
                value={targetRole}
                onChange={(e) => {
                  setTargetRole(e.target.value as UserRole);
                  setStatusMessage(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 capitalize"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
          </div>

          {/* Current Selection Impact Review */}
          {selectedUser && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Target Account: {selectedUser.name}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                  Current Role: <span className="capitalize font-medium text-gray-800 dark:text-gray-200">{selectedUser.role}</span> → Transition to:{' '}
                  <span className="capitalize font-bold text-purple-600 dark:text-purple-400">{targetRole}</span>
                </p>
              </div>

              {isSelf && (
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Self-demotion protection active</span>
                </div>
              )}
            </div>
          )}

          {/* Mandatory Audit Reason */}
          <div>
            <label htmlFor="rbac-reason" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Reason for Security Audit Log <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="rbac-reason"
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Course TA assignment, Faculty hiring approval, Role realignment..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-400"
            />
          </div>

          {/* Status Feedback Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isSameRole}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? 'Verifying & Persisting...' : 'Apply Role Modification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
