import React from 'react';
import { ShieldCheck, GraduationCap, BookOpen } from 'lucide-react';
import { UserRole } from '../../types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const isSm = size === 'sm';

  switch (role) {
    case 'administrator':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 ${
            isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <ShieldCheck className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-purple-600 dark:text-purple-400 shrink-0`} />
          Administrator
        </span>
      );
    case 'teacher':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${
            isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <BookOpen className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-600 dark:text-amber-400 shrink-0`} />
          Teacher
        </span>
      );
    case 'student':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 ${
            isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <GraduationCap className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-indigo-600 dark:text-indigo-400 shrink-0`} />
          Student
        </span>
      );
  }
};
