import { ThemePalette, AppThemeId } from '../types';

export interface ExtendedThemePalette extends ThemePalette {
  themeBgGradient: string;
  themeHeaderBg: string;
  themeAccentGradient: string;
}

export const THEME_PALETTES: ExtendedThemePalette[] = [
  {
    id: 'classic-navy',
    name: 'Academic Navy & Gold',
    tagline: 'Timeless Collegiate Prestige',
    description: 'The iconic academic aesthetic featuring deep midnight slate and navy backgrounds, gilded amber/gold highlights, and crystal-clear high-contrast typography.',
    primaryColor: '#08142c',
    accentColor: '#f59e0b',
    accentHover: '#d97706',
    headerGradient: 'from-slate-950 via-slate-900 to-indigo-950',
    badgeBg: 'bg-amber-500/15 border-amber-400/30 text-amber-300',
    badgeText: '#f59e0b',
    surfaceBg: '#f8fafc',
    borderAccent: 'border-amber-400/40',
    swatches: ['#08142c', '#1e293b', '#f59e0b', '#dfc15d', '#f8fafc'],
    themeBgGradient: 'linear-gradient(180deg, #08142c 0%, #0d1e3d 50%, #060e20 100%)',
    themeHeaderBg: '#070f26',
    themeAccentGradient: 'linear-gradient(135deg, #FFF3C4 0%, #DFC15D 40%, #C5A049 80%, #9E7D3B 100%)'
  },
  {
    id: 'emerald-scholar',
    name: 'Emerald Scholar',
    tagline: 'Ivy League & Natural Sciences',
    description: 'A distinguished botanical and STEM-inspired theme blending rich deep forest green, vivid emerald badges, and warm burnished brass accents.',
    primaryColor: '#022c22',
    accentColor: '#10b981',
    accentHover: '#059669',
    headerGradient: 'from-emerald-950 via-teal-950 to-slate-950',
    badgeBg: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
    badgeText: '#10b981',
    surfaceBg: '#f6fbf9',
    borderAccent: 'border-emerald-400/40',
    swatches: ['#022c22', '#064e3b', '#10b981', '#34d399', '#f6fbf9'],
    themeBgGradient: 'linear-gradient(180deg, #022c22 0%, #064e3b 50%, #042f2e 100%)',
    themeHeaderBg: '#02241c',
    themeAccentGradient: 'linear-gradient(135deg, #d1fae5 0%, #34d399 40%, #10b981 80%, #059669 100%)'
  },
  {
    id: 'royal-oxford',
    name: 'Royal Oxford & Amethyst',
    tagline: 'Imperial Classical Mathematics',
    description: 'A regal and dignified scholarly palette pairing deep sapphire midnight, vibrant royal azure, and electric imperial amethyst accents.',
    primaryColor: '#140b2e',
    accentColor: '#8b5cf6',
    accentHover: '#7c3aed',
    headerGradient: 'from-slate-950 via-indigo-950 to-purple-950',
    badgeBg: 'bg-purple-500/15 border-purple-400/30 text-purple-300',
    badgeText: '#8b5cf6',
    surfaceBg: '#f8faff',
    borderAccent: 'border-purple-400/40',
    swatches: ['#140b2e', '#1e1b4b', '#8b5cf6', '#a855f7', '#f8faff'],
    themeBgGradient: 'linear-gradient(180deg, #140b2e 0%, #1e1b4b 50%, #0f0724 100%)',
    themeHeaderBg: '#110926',
    themeAccentGradient: 'linear-gradient(135deg, #ede9fe 0%, #a78bfa 40%, #8b5cf6 80%, #7c3aed 100%)'
  },
  {
    id: 'crimson-citadel',
    name: 'Crimson Citadel',
    tagline: 'Historic University Heritage',
    description: 'An authoritative, high-prestige aesthetic inspired by historic brick universities, rich bordeaux crimson, warm vermilion, and burnished bronze.',
    primaryColor: '#2a040b',
    accentColor: '#e11d48',
    accentHover: '#be123c',
    headerGradient: 'from-stone-950 via-rose-950 to-red-950',
    badgeBg: 'bg-rose-500/15 border-rose-400/30 text-rose-300',
    badgeText: '#e11d48',
    surfaceBg: '#fffaf8',
    borderAccent: 'border-rose-400/40',
    swatches: ['#2a040b', '#450a0a', '#e11d48', '#fb7185', '#fffaf8'],
    themeBgGradient: 'linear-gradient(180deg, #2a040b 0%, #450a0a 50%, #1f0207 100%)',
    themeHeaderBg: '#220308',
    themeAccentGradient: 'linear-gradient(135deg, #ffe4e6 0%, #fb7185 40%, #e11d48 80%, #be123c 100%)'
  },
  {
    id: 'obsidian-champagne',
    name: 'Obsidian Onyx & Champagne',
    tagline: 'Executive High-Contrast Precision',
    description: 'An ultra-modern, executive dark theme built on sleek obsidian carbon, luminous champagne gold highlights, and cool platinum precision.',
    primaryColor: '#09090b',
    accentColor: '#eab308',
    accentHover: '#ca8a04',
    headerGradient: 'from-black via-zinc-950 to-neutral-900',
    badgeBg: 'bg-yellow-500/15 border-yellow-400/30 text-yellow-300',
    badgeText: '#eab308',
    surfaceBg: '#fcfcfd',
    borderAccent: 'border-yellow-400/40',
    swatches: ['#09090b', '#18181b', '#eab308', '#facc15', '#fcfcfd'],
    themeBgGradient: 'linear-gradient(180deg, #09090b 0%, #18181b 50%, #050507 100%)',
    themeHeaderBg: '#070709',
    themeAccentGradient: 'linear-gradient(135deg, #fef9c3 0%, #facc15 40%, #eab308 80%, #ca8a04 100%)'
  }
];

export const DEFAULT_THEME_ID: AppThemeId = 'classic-navy';

export function getThemeById(themeId?: string): ExtendedThemePalette {
  const found = THEME_PALETTES.find((t) => t.id === themeId);
  return found || THEME_PALETTES[0];
}

/**
 * Applies CSS variables and data-theme attribute on document root for immediate cross-app theme styling
 */
export function applyGlobalTheme(themeId: AppThemeId) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  try {
    localStorage.setItem('academic_portal_theme', themeId);
  } catch {}

  const theme = getThemeById(themeId);

  // Set CSS variables for fine-tuned CSS component styling across the entire DOM tree
  root.style.setProperty('--app-primary', theme.primaryColor);
  root.style.setProperty('--app-accent', theme.accentColor);
  root.style.setProperty('--app-accent-hover', theme.accentHover);
  root.style.setProperty('--app-border-accent', `${theme.accentColor}55`);
  root.style.setProperty('--app-bg-gradient', theme.themeBgGradient);
  root.style.setProperty('--app-header-bg', theme.themeHeaderBg);
  root.style.setProperty('--app-accent-gradient', theme.themeAccentGradient);
  root.style.setProperty('--app-badge-text', theme.badgeText);
  root.style.setProperty('--app-surface-bg', theme.surfaceBg);
}
