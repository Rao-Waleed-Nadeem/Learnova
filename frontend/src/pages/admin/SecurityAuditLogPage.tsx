import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  X,
  Filter,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Hash,
  Download,
} from 'lucide-react';
import { AuditEvent, AuditActionType, AuditOutcome } from '../../types';
import { filterAuditEvents } from '../../utils/adminLogic';
import { AuditDetailDrawer } from '../../components/admin/AuditDetailDrawer';

interface SecurityAuditLogPageProps {
  auditEvents: AuditEvent[];
}

export const SecurityAuditLogPage: React.FC<SecurityAuditLogPageProps> = ({ auditEvents }) => {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pageSize = 8;

  const filteredEvents = useMemo(() => {
    return filterAuditEvents(auditEvents, actionFilter, outcomeFilter, searchQuery);
  }, [auditEvents, actionFilter, outcomeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = useMemo(() => {
    const start = (currentPageNum - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPageNum, pageSize]);

  const handleInspect = (ev: AuditEvent) => {
    setSelectedEvent(ev);
    setDrawerOpen(true);
  };

  const handleClearFilters = () => {
    setActionFilter('all');
    setOutcomeFilter('all');
    setSearchQuery('');
    setCurrentPageNum(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Security Audit Log
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Immutable chronological record of security-critical actions across the platform (SRS §3.2.9)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Append-Only Integrity Active
          </span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPageNum(1);
              }}
              placeholder="Search by actor, target name, reason, or correlation ID..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPageNum(1);
              }}
              aria-label="Filter by action"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Action Types</option>
              <option value="ROLE_CHANGE">Role Changes</option>
              <option value="ACCOUNT_DEACTIVATED">Deactivations</option>
              <option value="ACCOUNT_ACTIVATED">Reactivations</option>
              <option value="ADMIN_LOGIN">Admin Sign-Ins</option>
              <option value="PASSWORD_CHANGED">Password Changes</option>
              <option value="PERMISSION_OVERRIDE_ATTEMPT">Permission Overrides</option>
            </select>
          </div>

          {/* Outcome Filter */}
          <div>
            <select
              value={outcomeFilter}
              onChange={(e) => {
                setOutcomeFilter(e.target.value);
                setCurrentPageNum(1);
              }}
              aria-label="Filter by outcome"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Outcomes</option>
              <option value="success">Success</option>
              <option value="blocked">Blocked</option>
              <option value="failure">Failure</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            Matching Events: <span className="font-bold text-gray-900 dark:text-white">{filteredEvents.length}</span>
          </span>

          {(actionFilter !== 'all' || outcomeFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
            >
              Reset audit filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-[#181C24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
        {paginatedEvents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">No audit records found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              No audit records match the current filter criteria.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#12161F] text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th scope="col" className="py-3.5 px-4 sm:px-6">Timestamp</th>
                  <th scope="col" className="py-3.5 px-4">Action</th>
                  <th scope="col" className="py-3.5 px-4">Actor</th>
                  <th scope="col" className="py-3.5 px-4">Target Entity</th>
                  <th scope="col" className="py-3.5 px-4">Outcome</th>
                  <th scope="col" className="py-3.5 px-4 hidden lg:table-cell">Correlation ID</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {paginatedEvents.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => handleInspect(ev)}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition cursor-pointer"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 sm:px-6">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {new Date(ev.timestamp).toLocaleDateString()}
                      </p>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                        {ev.action}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {ev.actorName}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        Role: {ev.actorRole}
                      </p>
                    </td>

                    {/* Target */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {ev.targetName}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 capitalize">
                        {ev.targetType}
                      </p>
                    </td>

                    {/* Outcome Badge */}
                    <td className="py-3 px-4">
                      {ev.outcome === 'success' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Success
                        </span>
                      )}
                      {ev.outcome === 'blocked' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Blocked
                        </span>
                      )}
                      {ev.outcome === 'failure' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          Failure
                        </span>
                      )}
                    </td>

                    {/* Correlation ID */}
                    <td className="py-3 px-4 hidden lg:table-cell font-mono text-[11px] text-gray-500 dark:text-gray-400">
                      {ev.correlationId}
                    </td>

                    {/* Inspect Action */}
                    <td className="py-3 px-4 sm:px-6 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspect(ev);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredEvents.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Showing{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {(currentPageNum - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {Math.min(currentPageNum * pageSize, filteredEvents.length)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {filteredEvents.length}
              </span>{' '}
              audit records
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
                disabled={currentPageNum === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-semibold text-gray-900 dark:text-white">
                Page {currentPageNum} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPageNum((p) => Math.min(totalPages, p + 1))}
                disabled={currentPageNum === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Detail Drawer */}
      <AuditDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        event={selectedEvent}
      />
    </div>
  );
};
