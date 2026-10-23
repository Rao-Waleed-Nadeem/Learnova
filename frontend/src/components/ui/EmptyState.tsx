import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 md:p-12 bg-white dark:bg-[#1B1E25] rounded-xl border border-[#D9DEE7] dark:border-[#343A46] ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[#F5F7FA] dark:bg-[#20242D] border border-[#D9DEE7] dark:border-[#343A46] flex items-center justify-center text-[#5B6472] dark:text-[#B5BDCA] mb-3">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[#1F2937] dark:text-[#F1F3F8] max-w-md">{title}</h3>
      <p className="text-sm text-[#5B6472] dark:text-[#B5BDCA] max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};
