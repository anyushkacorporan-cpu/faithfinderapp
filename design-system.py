import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# ── Step 1: Update constants.ts with full design system ──────────────────────
with open('src/lib/constants.ts', 'r', encoding='utf-8') as f:
    constants = f.read()

old_colors = """COLORS = {
  navy: '#1a1a2e', gold: '#c9a96e', cream: '#faf9f6', border: '#f0ede8',
  muted: '#888', lightBg: '#f5f3ef', green: '#2e7d32', lightGreen: '#e8f5e9',
  red: '#e74c6f', white: '#ffffff', text: '#333', placeholder: '#bbb',
};"""

new_colors = """COLORS = {
  // Core
  navy: '#1a1a2e',
  gold: '#c9a96e',
  cream: '#faf9f6',
  white: '#ffffff',
  // Backgrounds
  lightBg: '#f5f3ef',
  border: '#f0ede8',
  // Text
  text: '#1a1a2e',
  textSecondary: '#666',
  textMuted: '#999',
  placeholder: '#bbb',
  muted: '#888',
  // Semantic
  green: '#2e7d32',
  lightGreen: '#e8f5e9',
  red: '#e74c6f',
};

// ── Typography ──────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  // Display
  pageTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: '#1a1a2e' },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, color: '#1a1a2e' },
  // Cards
  cardTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#1a1a2e', lineHeight: 24 },
  cardSubtitle: { fontSize: 13, color: '#666', fontWeight: '500' as const },
  // Names
  userName: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#1a1a2e' },
  churchName: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#1a1a2e' },
  eventTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 17, color: '#1a1a2e' },
  // Body
  body: { fontSize: 14, color: '#1a1a2e', lineHeight: 22 },
  bodySmall: { fontSize: 13, color: '#666', lineHeight: 20 },
  // Meta
  caption: { fontSize: 12, color: '#999' },
  meta: { fontSize: 12, color: '#888' },
  // Buttons
  buttonPrimary: { fontSize: 15, fontWeight: '700' as const, color: '#ffffff' },
  buttonSecondary: { fontSize: 14, fontWeight: '600' as const, color: '#1a1a2e' },
  // Labels
  label: { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
};

// ── Spacing ─────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

// ── Radius ──────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 20, pill: 100,
};

// ── Shadows ─────────────────────────────────────────────────────────────────
export const SHADOWS = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  button: { shadowColor: '#1a1a2e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
};

// ── Buttons ─────────────────────────────────────────────────────────────────
export const BUTTON_STYLES = {
  primary: {
    backgroundColor: '#1a1a2e', borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 24, alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  secondary: {
    backgroundColor: 'transparent', borderRadius: 14, paddingVertical: 13,
    paddingHorizontal: 24, borderWidth: 1.5, borderColor: '#f0ede8',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  gold: {
    backgroundColor: '#c9a96e', borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 24, alignItems: 'center' as const, justifyContent: 'center' as const,
  },
};"""

if old_colors in constants:
    constants = constants.replace(old_colors, new_colors)
    with open('src/lib/constants.ts', 'w', encoding='utf-8') as f:
        f.write(constants)
    print('constants.ts updated')
else:
    print('WARNING: COLORS not found in constants.ts - checking format')
    print(repr(constants[:200]))

print('Design system tokens created')
print('ALL DONE')
