/**
 * Color role tokens (FPB-006 §3-4).
 *
 * Values are intentionally neutral placeholders per the Brand Neutral
 * Foundation amendment to FWO-001. No official Aureus palette is encoded
 * here. Replacing these values is the entire surface area required to
 * apply the finalized brand — no component should ever reference a raw
 * color value directly.
 *
 * Warmed for the Living Steward Workspace redesign (calm hospitality —
 * museum, private study, premium hotel lounge, never CRM/admin-dashboard
 * cold-blue-and-grey) — still placeholder values, still swapped as a unit
 * whenever the finalized brand is ratified. `surfaceSunken` and
 * `borderSubtle` are new roles: `surfaceSunken` is a recessed panel/room
 * background distinct from `surfaceSecondary`'s existing "list item"
 * meaning, and `borderSubtle` is a low-contrast hairline for calm internal
 * dividers, leaving `border` for higher-contrast card/input boundaries.
 */
export const colorTokens = {
  light: {
    surfacePrimary: '#faf7f2',
    surfaceSecondary: '#f1ebe1',
    surfaceTertiary: '#e6dccc',
    surfaceSunken: '#ece3d3',
    textPrimary: '#2b241c',
    textSecondary: '#5c5245',
    textTertiary: '#8c8171',
    border: '#ddd0ba',
    borderSubtle: '#ece2d0',
    focusRing: '#a8481f',
    actionPrimary: '#a8481f',
    actionPrimaryHover: '#8a3a19',
    actionSecondary: '#5c5245',
    success: '#3f7d4f',
    warning: '#b5750a',
    error: '#b23b2e',
    information: '#5c7a99',
    opportunity: '#8f6bb0',
    journey: '#3f8f83',
    steward: '#a8481f',
    conversation: '#5c5245',
  },
  dark: {
    surfacePrimary: '#1c1712',
    surfaceSecondary: '#241d16',
    surfaceTertiary: '#2e251b',
    surfaceSunken: '#211a14',
    textPrimary: '#f3ece1',
    textSecondary: '#cbbfae',
    textTertiary: '#9c8f7c',
    border: '#3c3226',
    borderSubtle: '#2b241b',
    focusRing: '#e08a52',
    actionPrimary: '#e08a52',
    actionPrimaryHover: '#eba377',
    actionSecondary: '#cbbfae',
    success: '#6bbf83',
    warning: '#e0a53d',
    error: '#e2685e',
    information: '#8fa9c2',
    opportunity: '#b49bd1',
    journey: '#5fb3a8',
    steward: '#e08a52',
    conversation: '#cbbfae',
  },
} as const;

export type ColorRole = keyof typeof colorTokens.light;
export type ThemeName = keyof typeof colorTokens;
