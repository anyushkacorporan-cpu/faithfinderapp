import { useColorScheme } from 'react-native';
import { useSettings } from './settingsStore';

// ─────────────────────────────────────────────────────────────────────────────
// Theme system
//
// The app historically read raw colors from constants.ts (COLORS). That object
// is still exported for backwards-compatibility, but new/updated screens should
// pull colors from `useThemeColors()` so they respond to the Appearance setting
// (Light / Dark / System).
//
// IMPORTANT: the old palette overloaded a few tokens — `navy` meant both "text"
// and "button background", and `white` meant both "card surface" and "text on a
// dark button". This theme splits those into semantic tokens so dark mode works:
//   - text / textSecondary / textMuted  → foreground text
//   - bg / card / cardAlt / border       → surfaces
//   - primary / onPrimary                → primary button bg + its label
//   - navy / gold / green / red …        → brand accents (icons, switches)
// When converting a screen, decide for each old color whether it was a
// foreground or a surface and map it to the matching token.
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeColors = {
  isDark: boolean;
  // Surfaces
  bg: string;          // screen background
  card: string;        // card / header / sheet surface
  cardAlt: string;     // subtle inset surface (old COLORS.lightBg)
  border: string;      // card & divider border (old COLORS.border)
  rowBorder: string;   // hairline between rows (old '#f5f3ef')
  // Foreground text
  text: string;        // primary text (old COLORS.navy / COLORS.text)
  textSecondary: string; // (old '#666' / COLORS.textSecondary)
  textMuted: string;   // (old '#888'/'#999'/'#aaa')
  placeholder: string; // input placeholders (old '#bbb')
  // Primary button
  primary: string;     // primary button background
  onPrimary: string;   // text/icon on the primary button
  // Brand accents (kept vivid in both themes)
  navy: string;        // accent surfaces / switch tracks
  gold: string;
  green: string;
  lightGreen: string;
  red: string;
  cream: string;
  white: string;       // literal white, for text/icons on colored fills
  // Misc
  overlay: string;     // modal scrim
  inputBg: string;     // text input background
};

export const LIGHT: ThemeColors = {
  isDark: false,
  bg: '#f8f7f4',
  card: '#ffffff',
  cardAlt: '#f5f3ef',
  border: '#f0ede8',
  rowBorder: '#f5f3ef',
  text: '#1a1a2e',
  textSecondary: '#666666',
  textMuted: '#999999',
  placeholder: '#bbbbbb',
  primary: '#1a1a2e',
  onPrimary: '#ffffff',
  navy: '#1a1a2e',
  gold: '#c9a96e',
  green: '#2e7d32',
  lightGreen: '#e8f5e9',
  red: '#e74c6f',
  cream: '#faf9f6',
  white: '#ffffff',
  overlay: 'rgba(0,0,0,0.45)',
  inputBg: '#f5f3ef',
};

export const DARK: ThemeColors = {
  isDark: true,
  bg: '#0f0f13',
  card: '#1b1b21',
  cardAlt: '#26262e',
  border: '#2c2c35',
  rowBorder: '#2a2a32',
  text: '#f3f3f6',
  textSecondary: '#b6b6c0',
  textMuted: '#8c8c98',
  placeholder: '#6b6b76',
  primary: '#c9a96e',      // gold reads better than navy on a near-black bg
  onPrimary: '#1a1a2e',
  navy: '#3a3a5c',         // lightened so switch tracks / accents stay visible
  gold: '#d4b47e',
  green: '#5bb85f',
  lightGreen: '#1d2b1e',
  red: '#f0688a',
  cream: '#1b1b21',
  white: '#ffffff',
  overlay: 'rgba(0,0,0,0.65)',
  inputBg: '#26262e',
};

/**
 * Resolve the active theme colors from the user's Appearance setting.
 * 'system' follows the OS light/dark setting.
 */
export function useThemeColors(): ThemeColors {
  const settings = useSettings();
  const system = useColorScheme();
  const pref = settings.appearance.theme; // 'light' | 'dark' | 'system'
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return isDark ? DARK : LIGHT;
}

/**
 * Text-size scaling driven by the Appearance setting.
 * Multiply a base font size by this factor to honor Small / Medium / Large.
 */
export function useFontScale(): number {
  const settings = useSettings();
  switch (settings.appearance.fontSize) {
    case 'small': return 0.9;
    case 'large': return 1.15;
    default: return 1;
  }
}
