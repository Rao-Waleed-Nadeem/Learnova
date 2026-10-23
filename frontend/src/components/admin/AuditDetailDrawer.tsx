import React from 'react';
import { X, ShieldCheck, Clock, User, Target, Hash, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AuditEvent } from '../../types';

interface AuditDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: AuditEvent | null;
}

export const AuditDetailDrawer: React.FC<AuditDetailDrawerProps> = ({ isOpen, onClose, event }) => {
  if (!isOpen || !event) return null;

  const getOutcomeBadge = () => {
    switch (event.outcome) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Success
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Blocked / Guardrail
          </span>
        );
      case 'failure':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Failure
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Security Audit Event Details"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#181C24] h-full shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Audit Record Details
              </h2>
              <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                {event.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Action & Outcome Banner */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
                Action Executed
              </p>
              <p className="text-base font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {event.action}
              </p>
            </div>
            <div>{getOutcomeBadge()}</div>
          </div>

          {/* Timestamp & Correlation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C212B]">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Timestamp</span>
              </div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">
                {new Date(event.timestamp).toLocaleString()}
              </p>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                {event.timestamp}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C212B]">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                <Hash className="w-3.5 h-3.5" />
                <span>Correlation ID</span>
              </div>
              <p className="text-xs font-mono font-bold text-gray-900 dark:text-white truncate">
                {event.correlationId}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Safe request tracer
              </p>
            </div>
          </div>

          {/* Actor Identity */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C212B] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Actor (Initiator)</span>
            </div>
            <div className="pt-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{event.actorName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{event.actorEmail}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                  Role: {event.actorRole}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono">
                  ID: {event.actorId}
                </span>
              </div>
            </div>
          </div>

          {/* Target Entity */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C212B] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Target Entity</span>
            </div>
            <div className="pt-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{event.targetName}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-semibold capitalize">
                  Type: {event.targetType}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono">
                  Target ID: {event.targetId}
                </span>
              </div>
            </div>
          </div>

          {/* Administrative Reason */}
          {event.reason && (
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C212B]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Recorded Administrative Reason</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 italic">
                "{event.reason}"
              </p>
            </div>
          )}

          {/* Safe Redacted Metadata */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#12161F]">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Privacy-Redacted Metadata (SRS §3.2.9)
            </p>
            <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 font-mono">
              <p>Client IP: <span className="text-gray-900 dark:text-white">{event.ipAddressSafe || 'Masked for PII Protection'}</span></p>
              <p>Storage Policy: <span className="text-emerald-600 dark:text-emerald-400">Append-Only Immutable Store</span></p>
              {event.details && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-gray-400 mb-1">State Payload Diff:</p>
                  <pre className="text-[11px] p-2 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#181C24] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
