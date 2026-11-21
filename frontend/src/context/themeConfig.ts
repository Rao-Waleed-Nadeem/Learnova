export type ThemeMode = 'light' | 'dark' | 'system';
export type PaletteId =
  | 'indigo'
  | 'emerald'
  | 'crimson'
  | 'cyan'
  | 'violet'
  | 'obsidian'
  | 'ocean'
  | 'sunset'
  | 'golden'
  | 'rose';

export type FontId = 'inter' | 'jakarta' | 'outfit' | 'lexend' | 'poppins' | 'serif' | 'space';
export type MotionMode = 'expressive' | 'minimal';

export interface PaletteTokens {
  primary700: string;
  primary600: string;
  primary500: string;
  primary100: string;
  primary050: string;
  focusRing: string;
  surfaceSelected: string;
}

export interface PaletteInfo {
  id: PaletteId;
  name: string;
  tagline: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  badgeBg: string;
  darkBadgeBg: string;
  lightTokens: PaletteTokens;
  darkTokens: PaletteTokens;
}

export interface FontInfo {
  id: FontId;
  name: string;
  family: string;
  category: string;
  description: string;
}

export const PALETTES: PaletteInfo[] = [
  {
    id: 'indigo',
    name: 'Oxford Royal',
    tagline: 'Prestige, Focus & University Classic',
    primaryLight: '#2646B8',
    primaryDark: '#4F75FF',
    accent: '#3156D3',
    badgeBg: '#E8EEFF',
    darkBadgeBg: 'rgba(79, 117, 255, 0.2)',
    lightTokens: {
      primary700: '#1E3A8A',
      primary600: '#2646B8',
      primary500: '#3156D3',
      primary100: '#E8EEFF',
      primary050: '#F4F6FF',
      focusRing: '#2646B8',
      surfaceSelected: '#E8EEFF',
    },
    darkTokens: {
      primary700: '#6388FF',
      primary600: '#4F75FF',
      primary500: '#3B66F5',
      primary100: 'rgba(79, 117, 255, 0.2)',
      primary050: 'rgba(79, 117, 255, 0.1)',
      focusRing: '#4F75FF',
      surfaceSelected: 'rgba(79, 117, 255, 0.22)',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Academy',
    tagline: 'Growth, Biology, STEM & Calm Clarity',
    primaryLight: '#059669',
    primaryDark: '#34D399',
    accent: '#10B981',
    badgeBg: '#ECFDF5',
    darkBadgeBg: 'rgba(16, 185, 129, 0.2)',
    lightTokens: {
      primary700: '#047857',
      primary600: '#059669',
      primary500: '#10B981',
      primary100: '#D1FAE5',
      primary050: '#ECFDF5',
      focusRing: '#059669',
      surfaceSelected: '#D1FAE5',
    },
    darkTokens: {
      primary700: '#6EE7B7',
      primary600: '#34D399',
      primary500: '#10B981',
      primary100: 'rgba(16, 185, 129, 0.2)',
      primary050: 'rgba(16, 185, 129, 0.1)',
      focusRing: '#34D399',
      surfaceSelected: 'rgba(16, 185, 129, 0.22)',
    },
  },
  {
    id: 'crimson',
    name: 'Cambridge Crimson',
    tagline: 'Ivy Heritage, Distinction & Warmth',
    primaryLight: '#9F1239',
    primaryDark: '#FB7185',
    accent: '#E11D48',
    badgeBg: '#FFF1F2',
    darkBadgeBg: 'rgba(244, 63, 94, 0.2)',
    lightTokens: {
      primary700: '#881337',
      primary600: '#9F1239',
      primary500: '#BE123C',
      primary100: '#FFE4E6',
      primary050: '#FFF1F2',
      focusRing: '#9F1239',
      surfaceSelected: '#FFE4E6',
    },
    darkTokens: {
      primary700: '#FDA4AF',
      primary600: '#FB7185',
      primary500: '#F43F5E',
      primary100: 'rgba(244, 63, 94, 0.2)',
      primary050: 'rgba(244, 63, 94, 0.1)',
      focusRing: '#FB7185',
      surfaceSelected: 'rgba(244, 63, 94, 0.22)',
    },
  },
  {
    id: 'cyan',
    name: 'Nordic Aurora',
    tagline: 'Scandinavian Clarity & Precision',
    primaryLight: '#0E7490',
    primaryDark: '#38BDF8',
    accent: '#06B6D4',
    badgeBg: '#ECFEFF',
    darkBadgeBg: 'rgba(6, 182, 212, 0.2)',
    lightTokens: {
      primary700: '#0E7490',
      primary600: '#0891B2',
      primary500: '#06B6D4',
      primary100: '#CFFAFE',
      primary050: '#ECFEFF',
      focusRing: '#0891B2',
      surfaceSelected: '#CFFAFE',
    },
    darkTokens: {
      primary700: '#7DD3FC',
      primary600: '#38BDF8',
      primary500: '#06B6D4',
      primary100: 'rgba(6, 182, 212, 0.2)',
      primary050: 'rgba(6, 182, 212, 0.1)',
      focusRing: '#38BDF8',
      surfaceSelected: 'rgba(6, 182, 212, 0.22)',
    },
  },
  {
    id: 'violet',
    name: 'Violet Scholar',
    tagline: 'Intellect, Creative Curiosity & EdTech',
    primaryLight: '#6D28D9',
    primaryDark: '#A78BFA',
    accent: '#8B5CF6',
    badgeBg: '#F5F3FF',
    darkBadgeBg: 'rgba(139, 92, 246, 0.2)',
    lightTokens: {
      primary700: '#581C87',
      primary600: '#6D28D9',
      primary500: '#7C3AED',
      primary100: '#EDE9FE',
      primary050: '#F5F3FF',
      focusRing: '#6D28D9',
      surfaceSelected: '#EDE9FE',
    },
    darkTokens: {
      primary700: '#C4B5FD',
      primary600: '#A78BFA',
      primary500: '#8B5CF6',
      primary100: 'rgba(139, 92, 246, 0.2)',
      primary050: 'rgba(139, 92, 246, 0.1)',
      focusRing: '#A78BFA',
      surfaceSelected: 'rgba(139, 92, 246, 0.22)',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian Minimal',
    tagline: 'High Contrast, Slate & Distraction-Free',
    primaryLight: '#1E293B',
    primaryDark: '#94A3B8',
    accent: '#475569',
    badgeBg: '#F1F5F9',
    darkBadgeBg: 'rgba(148, 163, 184, 0.2)',
    lightTokens: {
      primary700: '#0F172A',
      primary600: '#1E293B',
      primary500: '#334155',
      primary100: '#E2E8F0',
      primary050: '#F1F5F9',
      focusRing: '#1E293B',
      surfaceSelected: '#E2E8F0',
    },
    darkTokens: {
      primary700: '#E2E8F0',
      primary600: '#CBD5E1',
      primary500: '#94A3B8',
      primary100: 'rgba(148, 163, 184, 0.2)',
      primary050: 'rgba(148, 163, 184, 0.1)',
      focusRing: '#CBD5E1',
      surfaceSelected: 'rgba(148, 163, 184, 0.22)',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Depths',
    tagline: 'Maritime Navy, Calm Deep Focus & Tech',
    primaryLight: '#0369A1',
    primaryDark: '#60A5FA',
    accent: '#0284C7',
    badgeBg: '#E0F2FE',
    darkBadgeBg: 'rgba(56, 189, 248, 0.2)',
    lightTokens: {
      primary700: '#075985',
      primary600: '#0369A1',
      primary500: '#0284C7',
      primary100: '#E0F2FE',
      primary050: '#F0F9FF',
      focusRing: '#0369A1',
      surfaceSelected: '#E0F2FE',
    },
    darkTokens: {
      primary700: '#93C5FD',
      primary600: '#60A5FA',
      primary500: '#38BDF8',
      primary100: 'rgba(56, 189, 248, 0.2)',
      primary050: 'rgba(56, 189, 248, 0.1)',
      focusRing: '#60A5FA',
      surfaceSelected: 'rgba(56, 189, 248, 0.22)',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Boulevard',
    tagline: 'Warm Terracotta, Energy & Vitality',
    primaryLight: '#C2410C',
    primaryDark: '#FB923C',
    accent: '#EA580C',
    badgeBg: '#FFEDD5',
    darkBadgeBg: 'rgba(249, 115, 22, 0.2)',
    lightTokens: {
      primary700: '#9A3412',
      primary600: '#C2410C',
      primary500: '#EA580C',
      primary100: '#FFEDD5',
      primary050: '#FFF7ED',
      focusRing: '#C2410C',
      surfaceSelected: '#FFEDD5',
    },
    darkTokens: {
      primary700: '#FDBA74',
      primary600: '#FB923C',
      primary500: '#F97316',
      primary100: 'rgba(249, 115, 22, 0.2)',
      primary050: 'rgba(249, 115, 22, 0.1)',
      focusRing: '#FB923C',
      surfaceSelected: 'rgba(249, 115, 22, 0.22)',
    },
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    tagline: 'Rich Autumnal Amber, Radiance & Honour',
    primaryLight: '#D97706',
    primaryDark: '#FBBF24',
    accent: '#F59E0B',
    badgeBg: '#FEF3C7',
    darkBadgeBg: 'rgba(245, 158, 11, 0.2)',
    lightTokens: {
      primary700: '#92400E',
      primary600: '#D97706',
      primary500: '#F59E0B',
      primary100: '#FEF3C7',
      primary050: '#FFFBEB',
      focusRing: '#D97706',
      surfaceSelected: '#FEF3C7',
    },
    darkTokens: {
      primary700: '#FDE68A',
      primary600: '#FBBF24',
      primary500: '#F59E0B',
      primary100: 'rgba(245, 158, 11, 0.2)',
      primary050: 'rgba(245, 158, 11, 0.1)',
      focusRing: '#FBBF24',
      surfaceSelected: 'rgba(245, 158, 11, 0.22)',
    },
  },
  {
    id: 'rose',
    name: 'Desert Rose',
    tagline: 'Sophisticated Dusty Rose, Arts & Humanities',
    primaryLight: '#BE185D',
    primaryDark: '#F472B6',
    accent: '#DB2777',
    badgeBg: '#FCE7F3',
    darkBadgeBg: 'rgba(236, 72, 153, 0.2)',
    lightTokens: {
      primary700: '#9D174D',
      primary600: '#BE185D',
      primary500: '#DB2777',
      primary100: '#FCE7F3',
      primary050: '#FDF2F8',
      focusRing: '#BE185D',
      surfaceSelected: '#FCE7F3',
    },
    darkTokens: {
      primary700: '#FBCFE8',
      primary600: '#F472B6',
      primary500: '#EC4899',
      primary100: 'rgba(236, 72, 153, 0.2)',
      primary050: 'rgba(236, 72, 153, 0.1)',
      focusRing: '#F472B6',
      surfaceSelected: 'rgba(236, 72, 153, 0.22)',
    },
  },
];

export const FONTS: FontInfo[] = [
  {
    id: 'inter',
    name: 'Inter',
    family: "'Inter', system-ui, sans-serif",
    category: 'Modern Sans',
    description: 'Clean, balanced, high-legibility interface typography.',
  },
  {
    id: 'jakarta',
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', system-ui, sans-serif",
    category: 'Refined Editorial',
    description: 'Modern geometric elegance with humanist character.',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: "'Outfit', system-ui, sans-serif",
    category: 'EdTech Warm',
    description: 'Friendly, modern geometric design tailored for learning.',
  },
  {
    id: 'lexend',
    name: 'Lexend',
    family: "'Lexend', system-ui, sans-serif",
    category: 'High Fluency',
    description: 'Empirically engineered to improve cognitive reading speed.',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    family: "'Poppins', system-ui, sans-serif",
    category: 'Approachable',
    description: 'Warm, rounded geometric curves that inspire comfort.',
  },
  {
    id: 'serif',
    name: 'Academic Editorial',
    family: "'Inter', system-ui, sans-serif",
    category: 'Scholarly Classic',
    description: 'Prestigious serif display headings paired with clean body.',
  },
  {
    id: 'space',
    name: 'Space Grotesk',
    family: "'Space Grotesk', system-ui, sans-serif",
    category: 'STEM Technical',
    description: 'Confident character inspired by scientific computing.',
  },
];
