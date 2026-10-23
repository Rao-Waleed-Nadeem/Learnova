import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';

export const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme, actualTheme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: 'Light', icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { mode: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4 text-indigo-400" /> },
    { mode: 'system', label: 'System', icon: <Laptop className="w-4 h-4 text-gray-400" /> },
  ];

  if (compact) {
    // Quick segmented toggle for mobile drawer or tight spaces
    return (
      <div className="flex items-center p-1 bg-gray-100 dark:bg-[#1E232E] rounded-lg border border-gray-200 dark:border-[#2D3545]">
        {options.map((opt) => {
          const isSelected = theme === opt.mode;
          return (
            <button
              key={opt.mode}
              onClick={() => setTheme(opt.mode)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-[#252A36] text-[#1F2937] dark:text-[#F3F4F6] shadow-2xs font-semibold'
                  : 'text-[#5B6472] dark:text-[#9CA3AF] hover:text-[#1F2937] dark:hover:text-[#F3F4F6]'
              }`}
              title={`Switch to ${opt.label} mode`}
              aria-label={`${opt.label} mode`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Desktop header button with subtle dropdown & direct toggle click
  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#2D3545] bg-white dark:bg-[#1E232E] text-xs font-medium text-[#5B6472] dark:text-[#9CA3AF] hover:text-[#1F2937] dark:hover:text-[#F3F4F6] hover:bg-gray-50 dark:hover:bg-[#252A36] transition-colors cursor-pointer"
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        title={`Current theme: ${theme} (${actualTheme}). Click to change.`}
        aria-label="Change theme"
      >
        {actualTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-indigo-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
        <span className="hidden sm:inline capitalize">{theme}</span>
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-0.5 text-xs animate-in fade-in duration-100"
          role="menu"
        >
          <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-[#737D8C] dark:text-[#828B99]">
            Theme Preference
          </div>
          {options.map((opt) => {
            const isSelected = theme === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => {
                  setTheme(opt.mode);
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#E8EEFF] text-[#2646B8] dark:bg-[#3B66F5]/15 dark:text-[#8EB0FF] font-semibold'
                    : 'text-[#5B6472] dark:text-[#9CA3AF] hover:bg-gray-100 dark:hover:bg-[#222834] hover:text-[#1F2937] dark:hover:text-[#F3F4F6]'
                }`}
                role="menuitem"
              >
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
