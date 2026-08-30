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
  // Navigation capsule
  //
  // The bar gets tokens of its own rather than reusing card/border/text,
  // because its two themes are designed separately rather than derived from
  // one another. In light the selected tab is the dark solid; in dark it is
  // the raised, lighter one — the same idea expressed by opposite means, which
  // a shared token could not carry.
  navSurface: string;     // translucent tint painted over the blur (iOS)
  navSurfaceSolid: string; // opaque fallback where there is no blur
  navRim: string;         // hairline along the capsule's top edge
  navPill: string;        // the selected tab's card
  navPillRim: string;     // that card's own top-edge highlight
  navOn: string;          // icon + label on the selected pill
  navOff: string;         // icon + label of an unselected tab
  // Misc
  overlay: string;     // modal scrim
  inputBg: string;     // text input background
};

export const LIGHT: ThemeColors = {
  isDark: false,
  bg: '#ffffff',
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
  // Light: the capsule is near-white glass and the selected tab is the one
  // dark shape on the bar, so it reads as pressed into the surface from above.
  //
  // The pill is not the app's flat navy. Solid #1a1a2e sat on the glass as a
  // hard black slab — the one opaque thing on a bar whose whole point is that
  // light passes through it. Lifting the base a few steps and holding a little
  // transparency lets the surface behind tint it, so it belongs to the glass
  // instead of being pasted onto it. It stays far enough down that white text
  // clears AA over anything the feed puts behind it.
  navSurface: 'rgba(255,255,255,0.70)',
  navSurfaceSolid: '#ffffff',
  navRim: 'rgba(26,26,46,0.08)',
  navPill: 'rgba(46,46,68,0.88)',
  navPillRim: 'transparent',
  navOn: '#ffffff',
  navOff: '#666666',
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
  text: '#ffffff',
  textSecondary: '#f0f0f4',
  textMuted: '#d3d3db',
  placeholder: '#8a8a94',
  primary: '#c9a96e',      // gold reads better than navy on a near-black bg
  onPrimary: '#1a1a2e',
  navy: '#3a3a5c',         // lightened so switch tracks / accents stay visible
  gold: '#d4b47e',
  green: '#5bb85f',
  lightGreen: '#1d2b1e',
  red: '#f0688a',
  cream: '#1b1b21',
  white: '#ffffff',
  // Dark: the reverse would be a dark pill on a dark bar, which vanishes. The
  // selected tab is instead the *raised* one — a lighter surface with a lit top
  // edge — and the bar itself is a shade off the app background rather than a
  // lightened card, so it sits in the page instead of hovering as a pale slab.
  navSurface: 'rgba(30,30,38,0.62)',
  navSurfaceSolid: '#1b1b21',
  navRim: 'rgba(255,255,255,0.12)',
  navPill: '#33333f',
  navPillRim: 'rgba(255,255,255,0.10)',
  navOn: '#ffffff',
  navOff: '#8a8a94',
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
