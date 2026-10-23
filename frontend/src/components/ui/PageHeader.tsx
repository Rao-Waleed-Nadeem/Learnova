import React from 'react';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';
import { StatusBadge, BadgeStatus } from './StatusBadge';

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  description?: string;
  status?: BadgeStatus | string;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  courseBadge?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumbs,
  title,
  description,
  status,
  primaryAction,
  secondaryActions,
  courseBadge,
}) => {
  return (
    <div className="flex flex-col gap-3 pb-6 border-b border-[#D9DEE7] dark:border-[#2D3545] mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F2937] dark:text-[#F3F4F6]">{title}</h1>
            {status && <StatusBadge status={status} />}
            {courseBadge && (
              <span className="text-xs bg-[#E8EEFF] text-[#2646B8] dark:bg-[#3B66F5]/15 dark:text-[#8EB0FF] font-medium px-2.5 py-0.5 rounded-full border border-[#2646B8]/20 dark:border-[#3B66F5]/30">
                {courseBadge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-[#5B6472] dark:text-[#9CA3AF] max-w-3xl leading-relaxed">{description}</p>
          )}
        </div>

        {(primaryAction || secondaryActions) && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>
    </div>
  );
};
