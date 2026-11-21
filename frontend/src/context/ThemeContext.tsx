import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ThemeMode,
  PaletteId,
  FontId,
  MotionMode,
  PaletteInfo,
  FontInfo,
  PALETTES,
  FONTS,
} from './themeConfig';

export type { ThemeMode, PaletteId, FontId, MotionMode, PaletteInfo, FontInfo };
export { PALETTES, FONTS };

interface ThemeContextType {
  theme: ThemeMode;
  actualTheme: 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;
  palette: PaletteId;
  setPalette: (palette: PaletteId) => void;
  font: FontId;
  setFont: (font: FontId) => void;
  motionMode: MotionMode;
  setMotionMode: (mode: MotionMode) => void;
  resetToDefaults: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  actualTheme: 'dark',
  setTheme: () => {},
  palette: 'indigo',
  setPalette: () => {},
  font: 'inter',
  setFont: () => {},
  motionMode: 'expressive',
  setMotionMode: () => {},
  resetToDefaults: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('learnova_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {}
    return 'dark';
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');

  const [palette, setPaletteState] = useState<PaletteId>(() => {
    try {
      const saved = localStorage.getItem('learnova_palette') as PaletteId;
      if (PALETTES.some((p) => p.id === saved)) {
        return saved;
      }
    } catch {}
    return 'indigo';
  });

  const [font, setFontState] = useState<FontId>(() => {
    try {
      const saved = localStorage.getItem('learnova_font') as FontId;
      if (FONTS.some((f) => f.id === saved)) {
        return saved;
      }
    } catch {}
    return 'inter';
  });

  const [motionMode, setMotionModeState] = useState<MotionMode>(() => {
    try {
      const saved = localStorage.getItem('learnova_motion') as MotionMode;
      if (saved === 'expressive' || saved === 'minimal') {
        return saved;
      }
    } catch {}
    return 'expressive';
  });

  // Apply Theme (light / dark)
  useEffect(() => {
    const updateTheme = () => {
      let resolved: 'light' | 'dark' = 'light';
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolved = theme;
      }

      setActualTheme(resolved);

      const root = document.documentElement;
      root.setAttribute('data-theme', resolved);
      if (resolved === 'dark') {
        root.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }

      try {
        localStorage.setItem('learnova_theme', theme);
      } catch {}
    };

    updateTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Apply Palette (Dynamic CSS Custom Properties)
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', palette);
    document.body.setAttribute('data-palette', palette);

    const pal = PALETTES.find((p) => p.id === palette) || PALETTES[0];
    const isDark = actualTheme === 'dark';
    const tokens = isDark ? pal.darkTokens : pal.lightTokens;

    root.style.setProperty('--color-primary-700', tokens.primary700);
    root.style.setProperty('--color-primary-600', tokens.primary600);
    root.style.setProperty('--color-primary-500', tokens.primary500);
    root.style.setProperty('--color-primary-100', tokens.primary100);
    root.style.setProperty('--color-primary-050', tokens.primary050);
    root.style.setProperty('--color-focus-ring', tokens.focusRing);
    root.style.setProperty('--color-surface-selected', tokens.surfaceSelected);

    try {
      localStorage.setItem('learnova_palette', palette);
    } catch {}
  }, [palette, actualTheme]);

  // Apply Font
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font', font);
    document.body.setAttribute('data-font', font);

    const fontObj = FONTS.find((f) => f.id === font);
    if (fontObj) {
      root.style.setProperty('--font-sans', fontObj.family);
      document.body.style.fontFamily = fontObj.family;
    }

    try {
      localStorage.setItem('learnova_font', font);
    } catch {}
  }, [font]);

  // Apply Motion Mode
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-motion', motionMode);
    document.body.setAttribute('data-motion', motionMode);

    try {
      localStorage.setItem('learnova_motion', motionMode);
    } catch {}
  }, [motionMode]);

  const setTheme = (mode: ThemeMode) => setThemeState(mode);
  const setPalette = (p: PaletteId) => setPaletteState(p);
  const setFont = (f: FontId) => setFontState(f);
  const setMotionMode = (m: MotionMode) => setMotionModeState(m);

  const resetToDefaults = () => {
    setThemeState('dark');
    setPaletteState('indigo');
    setFontState('inter');
    setMotionModeState('expressive');
  };

  return (
    <ThemeContext.Provider
      value={{
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
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
