import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { PALETTES, FONTS } from '../../context/themeConfig';

interface AppFooterProps {
  onOpenDesignStudio?: () => void;
  className?: string;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  onOpenDesignStudio,
  className = '',
}) => {
  const { palette, font } = useTheme();
  const currentPalette = PALETTES.find((p) => p.id === palette) || PALETTES[0];
  const currentFont = FONTS.find((f) => f.id === font) || FONTS[0];

  return (
    <footer
      className={`h-[34px] border-t border-[#D9DEE7] dark:border-[#2D3545] bg-white/70 dark:bg-[#141822]/80 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between text-[11px] text-[#5B6472] dark:text-[#828B99] select-none shrink-0 ${className}`}
      aria-label="Application utility footer"
    >
      {/* Left: Operational telemetry status */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
          Learnova
        </span>
        <span className="text-gray-400 dark:text-gray-600 hidden xs:inline">•</span>
        <span className="text-gray-500 dark:text-gray-400 hidden xs:inline">v2.4.0</span>
      </div>

      {/* Center: Minimal Keyboard Shortcut Hint (Desktop Only) */}
      <div className="hidden md:flex items-center gap-2 text-gray-400 dark:text-gray-500">
        <span>Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-mono text-gray-700 dark:text-gray-300">⌘K</kbd> to search</span>
      </div>

      {/* Right: Active Palette & Font Pill with 1-Click Design Studio Opener */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenDesignStudio}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200/70 dark:hover:bg-gray-700 transition cursor-pointer text-gray-700 dark:text-gray-300"
          title="Open Design Studio to change palette or typography"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: currentPalette.accent }}
          />
          <span className="font-medium truncate max-w-[120px] sm:max-w-none">
            {currentPalette.name}
          </span>
          <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">•</span>
          <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">
            {currentFont.name}
          </span>
        </button>
      </div>
    </footer>
  );
};
