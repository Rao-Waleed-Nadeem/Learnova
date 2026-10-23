import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import { RoleBadge } from './RoleBadge';

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserAccount | null;
  currentAdminId: string;
  onConfirmRoleChange: (targetUserId: string, newRole: UserRole, reason: string) => Promise<{ success: boolean; error?: string }>;
}

export const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  currentAdminId,
  onConfirmRoleChange,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (targetUser) {
      // Pick first alternative role
      const altRole: UserRole = targetUser.role === 'student' ? 'teacher' : 'student';
      setSelectedRole(altRole);
      setReason('');
      setErrorMessage(null);
    }
  }, [targetUser, isOpen]);

  if (!isOpen || !targetUser) return null;

  const isSelf = targetUser.id === currentAdminId;
  const isSameRole = targetUser.role === selectedRole;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isSameRole) {
      setErrorMessage(`User already has the ${selectedRole} role.`);
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Please provide an administrative reason for the audit trail (SRS §3.2.9).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onConfirmRoleChange(targetUser.id, selectedRole, reason.trim());
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to modify role.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#181C24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="role-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                Modify User Role
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Security-governed RBAC reassignment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Target User Summary Card */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#10131B] border border-gray-200/80 dark:border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Target Account</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{targetUser.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{targetUser.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Role</p>
              <RoleBadge role={targetUser.role} size="sm" />
            </div>
          </div>

          {/* Self-Demotion Alert if applicable */}
          {isSelf && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Warning:</strong> You are modifying your own account. Self-demotion is blocked by safety guardrails to prevent administrative lockout.
              </span>
            </div>
          )}

          {/* Target Role Selector */}
          <div>
            <label htmlFor="target-role-select" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Select Target Role <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['student', 'teacher', 'administrator'] as UserRole[]).map((role) => {
                const isSelected = selectedRole === role;
                const isCurrent = targetUser.role === role;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 dark:border-purple-500 ring-2 ring-purple-600/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C212B] hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="capitalize font-semibold text-xs text-gray-900 dark:text-white">
                        {role}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        Current role
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Impact Note */}
          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
            <p className="font-semibold mb-0.5">Role Transition Impact:</p>
            {selectedRole === 'administrator' && (
              <p>Grants full system governance, role administration, security audit inspection, and operational telemetry access.</p>
            )}
            {selectedRole === 'teacher' && (
              <p>Grants access to Teacher Portal, course curriculum authoring, question bank creation, AI candidate generation, and class analytics.</p>
            )}
            {selectedRole === 'student' && (
              <p>Grants access to Student Portal, enrolled courses, interactive lessons, diagnostic/adaptive practice, and gamification rewards.</p>
            )}
          </div>

          {/* Administrative Reason (Required by SRS Audit logging) */}
          <div>
            <label htmlFor="audit-reason" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Reason for Audit Trail <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="audit-reason"
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Promotion to Teaching Assistant, Department transfer, Security policy alignment..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400"
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              This reason will be immutably recorded in the Security Audit Log with your admin ID.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSameRole}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? 'Updating & Logging...' : 'Confirm Role Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
