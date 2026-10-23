import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-[#5B6472] dark:text-[#B5BDCA]">
      <ol className="flex items-center flex-wrap gap-1.5">
        <li className="flex items-center">
          <button
            onClick={items[0]?.onClick}
            className="hover:text-[#3156D3] dark:hover:text-[#8EA8FF] flex items-center gap-1 transition-colors cursor-pointer"
            aria-label="Home / Dashboard"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-[#B8C1D0] dark:text-[#4A5362] shrink-0" aria-hidden="true" />
              {isLast || !item.onClick ? (
                <span
                  className="font-semibold text-[#1F2937] dark:text-[#F1F3F8] max-w-[200px] truncate"
                  aria-current={isLast ? 'page' : undefined}
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={item.onClick}
                  className="hover:text-[#3156D3] dark:hover:text-[#8EA8FF] transition-colors max-w-[150px] truncate cursor-pointer text-left"
                  title={item.label}
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
