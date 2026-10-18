import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Archive,
  Calendar,
  FileEdit,
} from 'lucide-react';

export type BadgeStatus =
  | 'draft'
  | 'published'
  | 'archived'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'completed';

interface StatusBadgeProps {
  status: BadgeStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const norm = status.toLowerCase();

  const configs: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    draft: {
      label: 'Draft',
      bg: 'bg-gray-100 dark:bg-gray-800/80',
      text: 'text-gray-700 dark:text-[#9CA3AF]',
      border: 'border-gray-300 dark:border-[#2D3545]',
      icon: <FileEdit className="w-3 h-3" />,
    },
    published: {
      label: 'Published',
      bg: 'bg-[#EAF7F0] dark:bg-[#10B981]/15',
      text: 'text-[#18794E] dark:text-[#34D399]',
      border: 'border-[#18794E]/20 dark:border-[#10B981]/30',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    archived: {
      label: 'Archived',
      bg: 'bg-gray-100 dark:bg-gray-800/80',
      text: 'text-gray-500 dark:text-[#828B99]',
      border: 'border-gray-300 dark:border-[#2D3545]',
      icon: <Archive className="w-3 h-3" />,
    },
    pending_review: {
      label: 'Pending review',
      bg: 'bg-[#FFF5D6] dark:bg-[#F59E0B]/15',
      text: 'text-[#946200] dark:text-[#FBBF24]',
      border: 'border-[#946200]/30 dark:border-[#F59E0B]/30',
      icon: <Clock className="w-3 h-3" />,
    },
    approved: {
      label: 'Approved',
      bg: 'bg-[#EAF7F0] dark:bg-[#10B981]/15',
      text: 'text-[#18794E] dark:text-[#34D399]',
      border: 'border-[#18794E]/20 dark:border-[#10B981]/30',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-[#FEF0EF] dark:bg-[#EF4444]/15',
      text: 'text-[#B42318] dark:text-[#F87171]',
      border: 'border-[#B42318]/25 dark:border-[#EF4444]/30',
      icon: <XCircle className="w-3 h-3" />,
    },
    scheduled: {
      label: 'Scheduled',
      bg: 'bg-[#EFF8FF] dark:bg-[#3B82F6]/15',
      text: 'text-[#175CD3] dark:text-[#60A5FA]',
      border: 'border-[#175CD3]/20 dark:border-[#3B82F6]/30',
      icon: <Calendar className="w-3 h-3" />,
    },
    completed: {
      label: 'Completed',
      bg: 'bg-[#EAF7F0] dark:bg-[#10B981]/15',
      text: 'text-[#18794E] dark:text-[#34D399]',
      border: 'border-[#18794E]/20 dark:border-[#10B981]/30',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
  };

  const item = configs[norm] || {
    label: status,
    bg: 'bg-gray-100 dark:bg-gray-800/80',
    text: 'text-gray-700 dark:text-[#9CA3AF]',
    border: 'border-gray-200 dark:border-[#2D3545]',
    icon: <AlertCircle className="w-3 h-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${item.bg} ${item.text} ${item.border} ${
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'
      }`}
    >
      <span className="shrink-0">{item.icon}</span>
      <span>{item.label}</span>
    </span>
  );
};
