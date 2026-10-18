import React, { useState } from 'react';
import {
  UserCog,
  Lock,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  Laptop,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { UserAccount } from '../../types';

interface AdminProfileSecurityPageProps {
  currentAdmin: UserAccount;
  onUpdateAdminProfile: (updated: UserAccount) => void;
  onUpdatePassword: (newPass: string) => Promise<{ success: boolean; error?: string }>;
  onSignOut: () => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminProfileSecurityPage: React.FC<AdminProfileSecurityPageProps> = ({
  currentAdmin,
  onUpdateAdminProfile,
  onUpdatePassword,
  onSignOut,
  onNotify,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Profile Edit
  const [name, setName] = useState(currentAdmin.name);
  const [department, setDepartment] = useState(currentAdmin.department || 'System Governance & Security');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPassValid = hasMinLength && hasUpper && hasLower && hasNumber;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please enter your existing password.');
      return;
    }

    if (!isPassValid) {
      setPasswordError('New password must satisfy all cryptographic policy requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await onUpdatePassword(newPassword);
      if (res.success) {
        onNotify('success', 'Administrative password updated. Recorded in security audit log.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.error || 'Failed to update credentials.');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserAccount = {
      ...currentAdmin,
      name: name.trim() || currentAdmin.name,
      department: department.trim() || currentAdmin.department,
    };
    onUpdateAdminProfile(updated);
    setIsEditingProfile(false);
    onNotify('success', 'Profile details updated.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Profile & Security Credentials
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your administrative profile, bcrypt password rotation, and active session tokens
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Administrator Identity
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
          >
            {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-gray-400">Display Name</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{currentAdmin.name}</p>
            </div>
            <div>
              <p className="text-gray-400">Primary Email</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{currentAdmin.email}</p>
            </div>
            <div>
              <p className="text-gray-400">Department</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{currentAdmin.department || 'Governance'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Password Rotation Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
          <Key className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Rotate Administrative Password
          </h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full sm:w-80 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Password Strength Checklist */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800 space-y-1 text-[11px]">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Password Policy Criteria:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                {hasMinLength ? '✓' : '•'} 8+ Characters
              </span>
              <span className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                {hasUpper ? '✓' : '•'} Uppercase Letter
              </span>
              <span className={`flex items-center gap-1 ${hasLower ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                {hasLower ? '✓' : '•'} Lowercase Letter
              </span>
              <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                {hasNumber ? '✓' : '•'} Number (0-9)
              </span>
            </div>
          </div>

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword || !isPassValid}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {isUpdatingPassword ? 'Hashing & Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Session Management */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Active Administrative Sessions
            </h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
            1 Active Session
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12161F] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white">Current Web Browser Session</p>
              <p className="text-[11px] text-gray-400">
                IP: 192.168.1.*** (Masked) • Authenticated via Learnova JWT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
