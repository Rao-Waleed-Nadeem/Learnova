import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Type,
  Sun,
  Moon,
  Laptop,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Sliders,
  Layers,
  Zap,
} from 'lucide-react';
import {
  useTheme,
  PALETTES,
  FONTS,
  ThemeMode,
} from '../../context/ThemeContext';

export interface DesignStudioWidgetProps {
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  showFloatingTrigger?: boolean;
}

export const DesignStudioWidget: React.FC<DesignStudioWidgetProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  onToggle,
  showFloatingTrigger = false,
}) => {
  const {
    theme,
    actualTheme,
    setTheme,
    palette,
    setPalette,
    font,
    setFont,
    motionMode,
    setMotionMode,
    resetToDefaults,
  } = useTheme();

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    setInternalIsOpen(false);
    if (onClose) onClose();
  };

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else if (controlledIsOpen !== undefined) {
      if (isOpen && onClose) onClose();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const [activeTab, setActiveTab] = useState<'palettes' | 'fonts' | 'preferences'>('palettes');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentPalette = PALETTES.find((p) => p.id === palette) || PALETTES[0];
  const currentFont = FONTS.find((f) => f.id === font) || FONTS[0];

  return (
    <>
      {/* Floating Trigger Dock Button (Optional) */}
      {showFloatingTrigger && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center">
          <button
            type="button"
            data-design-studio-trigger="true"
            onClick={handleToggle}
            aria-expanded={isOpen}
            aria-label="Open Design Studio"
            className="group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-white dark:bg-[#181C24] text-[#1F2937] dark:text-[#F3F4F6] border border-[#D9DEE7] dark:border-[#2D3545] shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-1 pointer-events-none">
              <span
                className="w-3.5 h-3.5 rounded-full shadow-xs"
                style={{
                  backgroundColor:
                    actualTheme === 'dark' ? currentPalette.primaryDark : currentPalette.primaryLight,
                }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full shadow-xs"
                style={{ backgroundColor: currentPalette.accent }}
              />
            </div>
            <span className="text-xs font-bold tracking-tight pointer-events-none">Design Studio</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse pointer-events-none" />
          </button>
        </div>
      )}

      {/* Popover / Drawer Panel with Backdrop */}
      {isOpen && (
        <>
          {/* Transparent Backdrop to Catch Outside Clicks cleanly */}
          <div
            className="fixed inset-0 z-[90] bg-black/25 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-150"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Design Studio Popover */}
          <div
            ref={panelRef}
            id="design-studio-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Design Studio"
            className="fixed z-[100] top-16 md:top-[74px] right-2 sm:right-6 w-[94vw] sm:w-[460px] max-h-[calc(100vh-5.5rem)] flex flex-col bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl shadow-2xl overflow-hidden view-enter-animation"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-[#D9DEE7] dark:border-[#2D3545] flex items-center justify-between bg-gray-50/80 dark:bg-[#1C212B]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0"
                  style={{
                    backgroundColor:
                      actualTheme === 'dark' ? currentPalette.primaryDark : currentPalette.primaryLight,
                  }}
                >
                  <Palette className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    Design Studio
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    Themes & Typography
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-800 transition text-xs flex items-center gap-1 cursor-pointer"
                  title="Reset to defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium hidden sm:inline">Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-800 transition cursor-pointer"
                  aria-label="Close Design Studio"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#D9DEE7] dark:border-[#2D3545] bg-gray-50/40 dark:bg-[#181C24] px-4 pt-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('palettes')}
                className={`pb-2 px-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'palettes'
                    ? 'border-indigo-600 dark:border-indigo-400 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Palettes ({PALETTES.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fonts')}
                className={`pb-2 px-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'fonts'
                    ? 'border-indigo-600 dark:border-indigo-400 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Fonts ({FONTS.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preferences')}
                className={`pb-2 px-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'preferences'
                    ? 'border-indigo-600 dark:border-indigo-400 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Preferences</span>
              </button>
            </div>

            {/* Body Content */}
            <div className="p-4 overflow-y-auto space-y-3 max-h-[calc(80vh-120px)]">
              {/* PALETTES TAB */}
              {activeTab === 'palettes' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PALETTES.map((p) => {
                    const isSelected = palette === p.id;
                    const previewColor = actualTheme === 'dark' ? p.primaryDark : p.primaryLight;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPalette(p.id)}
                        className={`group relative p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-400 bg-gray-50/90 dark:bg-[#1E232E] shadow-xs ring-1 ring-indigo-500/30'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-[#181C24]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full shadow-2xs border border-black/10"
                              style={{ backgroundColor: previewColor }}
                            />
                            <span
                              className="w-3 h-3 rounded-full shadow-2xs border border-black/10"
                              style={{ backgroundColor: p.accent }}
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-full shadow-2xs border border-black/10"
                              style={{
                                backgroundColor:
                                  actualTheme === 'dark' ? p.darkBadgeBg : p.badgeBg,
                              }}
                            />
                          </div>

                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {p.tagline}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* FONTS TAB */}
              {activeTab === 'fonts' && (
                <div className="space-y-2">
                  {FONTS.map((f) => {
                    const isSelected = font === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFont(f.id)}
                        className={`w-full group p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-400 bg-gray-50/90 dark:bg-[#1E232E] shadow-xs ring-1 ring-indigo-500/30'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-[#181C24]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {f.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                              {f.category}
                            </span>
                          </div>

                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <div
                          className="mt-1.5 text-sm text-gray-800 dark:text-gray-200 font-medium truncate"
                          style={{ fontFamily: f.family }}
                        >
                          Adaptive Curriculum & Dynamic Knowledge Mastery
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* PREFERENCES TAB */}
              {activeTab === 'preferences' && (
                <div className="space-y-4">
                  {/* Theme Mode */}
                  <div>
                    <label className="block text-xs font-bold text-gray-900 dark:text-white mb-2">
                      Appearance Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { mode: 'light' as ThemeMode, label: 'Light', icon: Sun },
                        { mode: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
                        { mode: 'system' as ThemeMode, label: 'System', icon: Laptop },
                      ].map((opt) => {
                        const isSelected = theme === opt.mode;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.mode}
                            type="button"
                            onClick={() => setTheme(opt.mode)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold'
                                : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Motion Preferences */}
                  <div>
                    <label className="block text-xs font-bold text-gray-900 dark:text-white mb-2">
                      Animation & Motion
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMotionMode('expressive')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-start gap-1 transition text-left cursor-pointer ${
                          motionMode === 'expressive'
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Expressive</span>
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          Smooth card lifts & feedback
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMotionMode('minimal')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-start gap-1 transition text-left cursor-pointer ${
                          motionMode === 'minimal'
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <Layers className="w-3.5 h-3.5 text-blue-500" />
                          <span>Minimal</span>
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          Instant transitions
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Active Summary */}
            <div className="px-4 py-2.5 border-t border-[#D9DEE7] dark:border-[#2D3545] bg-gray-50/80 dark:bg-[#1C212B] flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span className="truncate">
                <strong className="text-gray-800 dark:text-gray-200">{currentPalette.name}</strong> •{' '}
                <strong className="text-gray-800 dark:text-gray-200">{currentFont.name}</strong>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200/80 dark:bg-gray-800 font-mono shrink-0">
                Active
              </span>
            </div>
          </div>
        </>
      )}
    </>
  );
};
