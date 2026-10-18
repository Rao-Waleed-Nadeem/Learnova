import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
}

export interface ActiveChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  activeChips?: ActiveChip[];
  onClearAll?: () => void;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  activeChips = [],
  onClearAll,
}) => {
  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <label htmlFor="search-input" className="sr-only">
            {searchPlaceholder}
          </label>
          <Search className="w-4 h-4 text-[#737D8C] dark:text-[#929BAA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-[#2D3545] text-[#1F2937] dark:text-[#F3F4F6] placeholder-[#737D8C] dark:placeholder-[#828B99] text-sm rounded-lg pl-10 pr-4 py-2 focus:border-[#3156D3] dark:focus:border-[#4F75FF] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737D8C] dark:text-[#9CA3AF] hover:text-[#1F2937] dark:hover:text-[#F3F4F6] p-0.5 cursor-pointer"
              aria-label="Clear search input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown filters */}
        {filters.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-[#737D8C] dark:text-[#828B99] hidden md:flex items-center gap-1 shrink-0 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter by:
            </span>
            {filters.map((f) => (
              <div key={f.id} className="shrink-0">
                <label htmlFor={`filter-${f.id}`} className="sr-only">
                  {f.label}
                </label>
                <select
                  id={`filter-${f.id}`}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  className="bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-[#2D3545] text-xs font-medium text-[#1F2937] dark:text-[#F3F4F6] rounded-lg px-2.5 py-2 pr-7 focus:border-[#3156D3] dark:focus:border-[#4F75FF] focus:outline-none cursor-pointer"
                >
                  <option value="">All {f.label}</option>
                  {f.options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#1B1E25]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {(activeChips.length > 0 || searchQuery) && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-[#5B6472] dark:text-[#9CA3AF]">
          <span className="font-medium">Active filters:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 bg-[#E8EEFF] text-[#2646B8] dark:bg-[#3B66F5]/15 dark:text-[#8EB0FF] px-2.5 py-1 rounded-full border border-[#2646B8]/20 dark:border-[#3B66F5]/30">
              Query: &quot;{searchQuery}&quot;
              <button
                onClick={() => onSearchChange('')}
                className="hover:text-red-600 dark:hover:text-red-400 cursor-pointer ml-1"
                aria-label="Remove search query filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 bg-gray-100 dark:bg-[#202530] text-[#1F2937] dark:text-[#F3F4F6] px-2.5 py-1 rounded-full border border-gray-300 dark:border-[#2D3545]"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="hover:text-red-600 dark:hover:text-red-400 cursor-pointer ml-1"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-xs text-[#3156D3] dark:text-[#60A5FA] hover:underline font-medium cursor-pointer ml-1"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
