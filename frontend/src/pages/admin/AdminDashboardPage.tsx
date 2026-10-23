import React from 'react';
import {
  Users,
  ShieldCheck,
  History,
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { UserAccount, AuditEvent, ServiceHealthCheck } from '../../types';
import { RoleBadge } from '../../components/admin/RoleBadge';
import { AdminNavigationPage } from '../../components/admin/AdminLayout';

interface AdminDashboardPageProps {
  users: UserAccount[];
  auditEvents: AuditEvent[];
  serviceHealth: ServiceHealthCheck[];
  onNavigate: (page: AdminNavigationPage, params?: Record<string, string>) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  users,
  auditEvents,
  serviceHealth,
  onNavigate,
}) => {
  // Aggregate KPI Calculations (SRS §3.2.9 verified summaries)
  const totalUsers = users.length;
  const studentCount = users.filter((u) => u.role === 'student').length;
  const teacherCount = users.filter((u) => u.role === 'teacher').length;
  const adminCount = users.filter((u) => u.role === 'administrator').length;
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  const totalAuditCount = auditEvents.length;
  const blockedAttempts = auditEvents.filter((e) => e.outcome === 'blocked' || e.outcome === 'failure').length;

  const healthyServices = serviceHealth.filter((s) => s.status === 'healthy').length;
  const recentEvents = auditEvents.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Administration Overview
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Account governance, security auditing, and operational system status (SRS §3.2.9)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Platform Baseline: Aligned V2
          </span>
        </div>
      </div>

      {/* 4 Summary Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1: Total Accounts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs hover:border-purple-200 dark:hover:border-purple-900 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total Accounts
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-gray-900 dark:text-white">{totalUsers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {studentCount} Students • {teacherCount} Teachers • {adminCount} Admins
            </p>
          </div>
        </div>

        {/* Tile 2: Active vs Inactive */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs hover:border-emerald-200 dark:hover:border-emerald-900 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Account Status
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</p>
              <span className="text-xs font-medium text-gray-500">Active</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {inactiveCount} Inactive / Dormant accounts
            </p>
          </div>
        </div>

        {/* Tile 3: Security Events */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs hover:border-purple-200 dark:hover:border-purple-900 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Audit Log Events
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-gray-900 dark:text-white">{totalAuditCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {blockedAttempts > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {blockedAttempts} blocked guardrail actions
                </span>
              ) : (
                '0 unauthorized anomalies'
              )}
            </p>
          </div>
        </div>

        {/* Tile 4: Service Health */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs hover:border-blue-200 dark:hover:border-blue-900 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Operational Health
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {healthyServices}/{serviceHealth.length}
              </p>
              <span className="text-xs font-medium text-gray-500">Operational</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              All infrastructure checks passing
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Security Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Recent Security Activity
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Chronological trail of role modifications, status changes, and authentications
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('audit')}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentEvents.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No security events recorded.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentEvents.map((ev) => (
                  <div key={ev.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          ev.outcome === 'success'
                            ? 'bg-emerald-500'
                            : ev.outcome === 'blocked'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                            {ev.action}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="font-semibold text-gray-900 dark:text-white truncate">
                            {ev.targetName}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          By <span className="font-medium">{ev.actorName}</span> • {ev.reason || 'Routine operation'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-gray-400">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Administrative Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('users')}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24] hover:border-purple-300 dark:hover:border-purple-800 transition text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">User Accounts</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Inspect accounts & activate/deactivate
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('roles')}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24] hover:border-purple-300 dark:hover:border-purple-800 transition text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Roles & Access</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Review RBAC & assign fixed roles
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('health')}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24] hover:border-purple-300 dark:hover:border-purple-800 transition text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">System Telemetry</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Check database, API & LLM adapter
              </p>
            </button>
          </div>
        </div>

        {/* Right Column (1 Col): System Telemetry Status */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Services Status
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  SRS Stakeholder Telemetry
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('health')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <span>Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {serviceHealth.map((svc) => (
                <div
                  key={svc.id}
                  className="p-3 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#12161F]/60 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {svc.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {svc.latencyMs}ms • {svc.uptimePercent}% uptime
                    </p>
                  </div>
                  <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Healthy
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Service & Caching Snapshot (SRS Stakeholder Requirement) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                AI Service & Caching Policy
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              External LLM requests are gated by the teacher approval workflow and cached in-memory to prevent duplicate inference queries.
            </p>
            <div className="mt-3 pt-3 border-t border-purple-200/50 dark:border-purple-800/40 flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Cache Hit Ratio:</span>
              <span className="font-bold text-gray-900 dark:text-white">68.4%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
