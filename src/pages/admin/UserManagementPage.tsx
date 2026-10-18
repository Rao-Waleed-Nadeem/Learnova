import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  UserCheck,
  UserX,
  Shield,
  Eye,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ShieldAlert,
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import { RoleBadge } from '../../components/admin/RoleBadge';
import { filterUsers } from '../../utils/adminLogic';
import { AdminNavigationPage } from '../../components/admin/AdminLayout';

interface UserManagementPageProps {
  users: UserAccount[];
  currentAdminId: string;
  onNavigate: (page: AdminNavigationPage, params?: Record<string, string>) => void;
  onRequestRoleChange: (user: UserAccount) => void;
  onRequestStatusChange: (user: UserAccount) => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  users,
  currentAdminId,
  onNavigate,
  onRequestRoleChange,
  onRequestStatusChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const pageSize = 8;

  // Filter and sort
  const filteredUsers = useMemo(() => {
    return filterUsers(users, searchQuery, roleFilter, statusFilter, sortBy);
  }, [users, searchQuery, roleFilter, statusFilter, sortBy]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPageNum - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPageNum, pageSize]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSortBy('name_asc');
    setCurrentPageNum(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search, inspect, and govern accounts across Student, Teacher, and Administrator roles (SRS §3.2.9)
          </p>
        </div>

        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Total: <span className="font-bold text-gray-900 dark:text-white">{users.length} accounts</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPageNum(1);
              }}
              placeholder="Search by name or email address..."
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

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPageNum(1);
              }}
              aria-label="Filter by role"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPageNum(1);
              }}
              aria-label="Filter by status"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Sort and Clear Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-700 dark:text-gray-300 font-medium"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="role">Role</option>
              <option value="created_desc">Created (Newest First)</option>
              <option value="created_asc">Created (Oldest First)</option>
            </select>
          </div>

          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'name_asc') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-[#181C24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
        {paginatedUsers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">No accounts found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              No user accounts match your search query or filter parameters. Try resetting filters.
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
                  <th scope="col" className="py-3.5 px-4 sm:px-6">User Account</th>
                  <th scope="col" className="py-3.5 px-4">Role</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4 hidden md:table-cell">Created</th>
                  <th scope="col" className="py-3.5 px-4 hidden lg:table-cell">Last Active</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {paginatedUsers.map((user) => {
                  const isSelf = user.id === currentAdminId;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition"
                    >
                      {/* Name & Email */}
                      <td className="py-3 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {user.avatar || user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {user.name}
                              {isSelf && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        <RoleBadge role={user.role} size="sm" />
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 hidden md:table-cell text-gray-500 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      {/* Last Active */}
                      <td className="py-3 px-4 hidden lg:table-cell text-gray-500 dark:text-gray-400">
                        {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onNavigate('user_details', { userId: user.id })}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1 cursor-pointer"
                            title="Inspect user profile & audit trail"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                            <span className="hidden sm:inline">Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onRequestRoleChange(user)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
                            title="Modify user role"
                          >
                            Role
                          </button>

                          <button
                            type="button"
                            onClick={() => onRequestStatusChange(user)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              user.isActive
                                ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            title={user.isActive ? 'Deactivate account' : 'Reactivate account'}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredUsers.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Showing{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {(currentPageNum - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {Math.min(currentPageNum * pageSize, filteredUsers.length)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {filteredUsers.length}
              </span>{' '}
              accounts
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
    </div>
  );
};
