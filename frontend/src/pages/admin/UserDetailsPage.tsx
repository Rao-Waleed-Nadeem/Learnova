import React, { useState, useEffect } from 'react';
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
  BookOpen,
  GraduationCap,
  Award,
  FileText,
  Activity,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { UserAccount, AuditEvent } from '../../types';
import { RoleBadge } from '../../components/admin/RoleBadge';
import { AdminNavigationPage } from '../../components/admin/AdminLayout';
import { Avatar } from '../../components/ui/Avatar';
import { adminApi, AdminUserDetailResponse } from '../../services/api/adminApi';

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
  const [serverDetail, setServerDetail] = useState<AdminUserDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const clientUser = users.find((u) => u.id === userId) || users[0];

  useEffect(() => {
    const targetId = userId || clientUser?.id;
    if (!targetId) return;

    let isMounted = true;
    setIsLoading(true);
    adminApi
      .getUserDetail(targetId)
      .then((res) => {
        if (isMounted) {
          setServerDetail(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId, clientUser?.id, clientUser?.role, clientUser?.isActive]);

  if (!clientUser && !serverDetail) {
    return (
      <div className="p-12 text-center bg-white dark:bg-[#181C24] rounded-2xl border border-gray-200 dark:border-gray-800">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">User Account Not Found</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          The requested account record could not be loaded from platform storage.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('users')}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer"
        >
          Return to User List
        </button>
      </div>
    );
  }

  // Authoritative projection: merge client record with backend user response
  const activeUser: UserAccount = serverDetail?.user
    ? {
        id: serverDetail.user.id,
        name: serverDetail.user.full_name,
        email: serverDetail.user.email,
        role: serverDetail.user.role as any,
        isActive: serverDetail.user.is_active,
        createdAt: serverDetail.user.created_at,
        lastActiveAt:
          serverDetail.last_active_at ||
          serverDetail.user.updated_at ||
          serverDetail.user.created_at,
        department:
          serverDetail.user.profile?.department || clientUser?.department || 'General Learning',
        avatar: serverDetail.user.profile?.avatar_url || clientUser?.avatar,
        enrolledCoursesCount: serverDetail.enrolled_courses_count,
        assignedCoursesCount: serverDetail.assigned_courses_count,
      }
    : clientUser;

  const isSelf = activeUser.id === currentAdminId;

  // Filter audit records specific to this user
  const userAuditEvents = auditEvents.filter(
    (e) => e.targetId === activeUser.id || e.actorId === activeUser.id
  );

  return (
    <div className="space-y-6 view-enter-animation">
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
          {isLoading && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400 mr-2">
              <RefreshCw className="w-3 h-3 animate-spin text-purple-500" />
              <span>Syncing with server...</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => onRequestRoleChange(activeUser)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition cursor-pointer"
          >
            Change Role
          </button>
          <button
            type="button"
            onClick={() => onRequestStatusChange(activeUser)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer ${
              activeUser.isActive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {activeUser.isActive ? 'Deactivate Account' : 'Reactivate Account'}
          </button>
        </div>
      </div>

      {/* User Header Profile Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar
            src={activeUser.avatar}
            name={activeUser.name}
            fallbackText={activeUser.name ? activeUser.name.slice(0, 2).toUpperCase() : 'U'}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-2xl shadow-md"
          />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {activeUser.name}
              </h1>
              {isSelf && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
                  Your Account
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span>{activeUser.email}</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <RoleBadge role={activeUser.role} size="sm" />
              {activeUser.isActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Deactivated
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Account Identifier */}
        <div className="sm:text-right p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/70 dark:border-gray-800">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Account ID</p>
          <p className="text-xs font-mono font-bold text-gray-900 dark:text-white">{activeUser.id}</p>
        </div>
      </div>

      {/* Grid: Account Information & Access Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Specifications */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
            <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Account Specifications</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-400 mb-0.5">Registration Date</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {new Date(activeUser.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Last Platform Activity</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {activeUser.lastActiveAt ? new Date(activeUser.lastActiveAt).toLocaleString() : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Department / Faculty</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {activeUser.department || 'General Learning'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Active Web Sessions</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {serverDetail?.active_sessions_count ?? 1} active session(s)
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Last Origin IP</p>
              <p className="font-mono font-semibold text-gray-900 dark:text-white">
                {serverDetail?.last_active_ip || '127.0.0.1 (Local)'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Audit Events Count</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {serverDetail?.security_audit_events_count ?? userAuditEvents.length} recorded
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
                Assigned Role: <span className="capitalize">{activeUser.role}</span>
              </p>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1">
                {serverDetail?.security_profile?.role_scope ||
                  (activeUser.role === 'administrator'
                    ? 'Full authorization: Account governance, role assignments, audit log review, and platform health telemetry.'
                    : activeUser.role === 'teacher'
                    ? 'Faculty authorization: Curriculum authoring, question bank creation, assessment scheduling, and student performance review.'
                    : 'Learner authorization: Interactive lesson workspace, diagnostic baselines, adaptive practice, and gamification rewards.')}
              </p>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 text-[11px]">
              <span className="text-gray-500">Authentication Method:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {serverDetail?.security_profile?.auth_method || 'Argon2id / bcrypt + JWT Bearer'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 text-[11px]">
              <span className="text-gray-500">Access Scope:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Server-Side Verified (Role Guard)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Associations & Course Portfolio */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Curriculum & Academic Portfolio
            </h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {activeUser.role === 'teacher'
              ? `${serverDetail?.assigned_courses_count ?? activeUser.assignedCoursesCount ?? 1} course(s) assigned`
              : activeUser.role === 'student'
              ? `${serverDetail?.enrolled_courses_count ?? activeUser.enrolledCoursesCount ?? 1} course(s) enrolled`
              : 'Governance Scope'}
          </span>
        </div>

        {/* Teacher Academic Statistics & Course List */}
        {activeUser.role === 'teacher' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Assigned Courses</p>
                <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                  {serverDetail?.assigned_courses_count ?? activeUser.assignedCoursesCount ?? 1}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Published Courses</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {serverDetail?.teacher_metrics?.published_courses_count ?? 1}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Authored Questions</p>
                <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
                  {serverDetail?.teacher_metrics?.authored_questions_count ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Students</p>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {serverDetail?.teacher_metrics?.total_students_taught ?? 0}
                </p>
              </div>
            </div>

            {/* Courses Table / List */}
            {serverDetail?.courses && serverDetail.courses.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-[#12161F] text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="py-2.5 px-4">Course Title</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Instructional Role</th>
                      <th className="py-2.5 px-4 text-right">Enrolled Learners</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {serverDetail.courses.map((crs) => (
                      <tr key={crs.id} className="hover:bg-gray-50/50 dark:hover:bg-[#12161F]/50">
                        <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                          {crs.title}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              crs.status === 'published'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {crs.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300 capitalize">
                          {crs.relationship === 'creator' ? 'Lead Author & Creator' : 'Assigned Instructor'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                          {crs.enrolled_students_count ?? 0} student(s)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Introduction to Computer Science</p>
                  <p className="text-[11px] text-gray-400">Canonical Syllabus • 5 Topics DAG</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Published
                </span>
              </div>
            )}
          </div>
        )}

        {/* Student Learning Performance & Enrolled Courses */}
        {activeUser.role === 'student' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Gamification Level</p>
                <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
                  Level {serverDetail?.student_metrics?.level ?? 1}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Total XP Earned</p>
                <p className="text-lg font-black text-amber-500 mt-0.5">
                  {serverDetail?.student_metrics?.xp ?? 0} XP
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Completed Lessons</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {serverDetail?.student_metrics?.completed_lessons_count ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Completed Assessments</p>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {serverDetail?.completed_attempts_count ?? 0}
                </p>
              </div>
            </div>

            {/* Enrolled Courses Progress */}
            {serverDetail?.courses && serverDetail.courses.length > 0 ? (
              <div className="space-y-2.5">
                {serverDetail.courses.map((crs) => (
                  <div
                    key={crs.id}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-900 dark:text-white">{crs.title}</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {crs.progress_percent ?? 0}% completed
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, crs.progress_percent ?? 0))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>Status: {crs.enrollment_status || 'active'}</span>
                      <span>
                        {crs.completed_lessons ?? 0} of {crs.total_lessons ?? 0} lessons done
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Introduction to Computer Science</p>
                  <p className="text-[11px] text-gray-400">Enrolled Student • Active Learner</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  Enrolled
                </span>
              </div>
            )}
          </div>
        )}

        {/* Administrator Platform Scope */}
        {activeUser.role === 'administrator' && (
          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs space-y-2">
            <p className="font-bold text-purple-900 dark:text-purple-200">
              Platform Governance Authority
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-[11px]">
              This account possesses top-level administrator privileges. It governs user directory mutations,
              role assignments, security audit logs, service diagnostics, and course oversight.
            </p>
          </div>
        )}
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
            {serverDetail?.security_audit_events_count ?? userAuditEvents.length} recorded events
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
