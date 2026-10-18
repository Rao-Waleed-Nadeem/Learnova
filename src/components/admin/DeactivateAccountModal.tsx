import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserAccount } from '../../types';

interface DeactivateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserAccount | null;
  currentAdminId: string;
  onConfirmStatusChange: (targetUserId: string, nextStatus: boolean, reason: string) => Promise<{ success: boolean; error?: string }>;
}

export const DeactivateAccountModal: React.FC<DeactivateAccountModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  currentAdminId,
  onConfirmStatusChange,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !targetUser) return null;

  const isDeactivating = targetUser.isActive;
  const isSelf = targetUser.id === currentAdminId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason.trim()) {
      setErrorMessage('Please provide an administrative reason for the security audit log.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onConfirmStatusChange(targetUser.id, !isDeactivating, reason.trim());
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to update account status.');
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
      aria-labelledby="deactivate-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-[#181C24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDeactivating
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isDeactivating ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="deactivate-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {isDeactivating ? 'Deactivate Account' : 'Reactivate Account'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Administrative account lifecycle management
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
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Target Identity Summary */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#10131B] border border-gray-200/80 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Target User</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{targetUser.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{targetUser.email} • Role: {targetUser.role}</p>
          </div>

          {/* Explanation of consequences & reversibility */}
          <div
            className={`p-3 rounded-xl border text-xs ${
              isDeactivating
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <p className="font-semibold mb-1">
              {isDeactivating ? 'Expected Impact (Reversible):' : 'Reactivation Impact:'}
            </p>
            {isDeactivating ? (
              <ul className="list-disc list-inside space-y-0.5">
                <li>User will be prevented from authenticating into Learnova.</li>
                <li>Existing learning progress, enrollments, and records are safely preserved.</li>
                <li>This action can be reversed at any time by an authorized administrator.</li>
              </ul>
            ) : (
              <p>The account will immediately regain platform authentication privileges and access to assigned course resources.</p>
            )}
          </div>

          {/* Self-Deactivation Guardrail Alert */}
          {isSelf && isDeactivating && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>You cannot deactivate your own administrative account while currently authenticated.</span>
            </div>
          )}

          {/* Mandatory Reason */}
          <div>
            <label htmlFor="deactivate-reason" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Reason for Audit Trail <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="deactivate-reason"
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isDeactivating
                  ? 'e.g., Leave of absence, Dormant account review, Policy compliance...'
                  : 'e.g., Re-enrollment approved, Faculty reinstatement...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent placeholder:text-gray-400"
            />
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
              disabled={isSubmitting || (isSelf && isDeactivating)}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isDeactivating
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting
                ? 'Processing...'
                : isDeactivating
                ? 'Confirm Deactivation'
                : 'Confirm Reactivation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
