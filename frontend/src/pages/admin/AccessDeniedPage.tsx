import React from 'react';
import { ShieldAlert, ArrowLeft, ArrowRightLeft, Lock } from 'lucide-react';

interface AccessDeniedPageProps {
  onSwitchPortal: (portal: 'student' | 'teacher' | 'admin') => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ onSwitchPortal }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">
            Administrative Access Restricted
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            This portal requires verified Administrator credentials under Learnova's Role-Based Access Control policy (SRS §3.2.9).
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300">
          <p className="font-semibold text-gray-900 dark:text-white">Authorized Roles:</p>
          <p className="mt-1">
            Only accounts with the <strong className="text-purple-600">Administrator</strong> role can inspect audit logs and govern accounts.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => onSwitchPortal('admin')}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition cursor-pointer"
          >
            Authenticate as Administrator
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSwitchPortal('student')}
              className="py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition cursor-pointer"
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => onSwitchPortal('teacher')}
              className="py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition cursor-pointer"
            >
              Teacher Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
