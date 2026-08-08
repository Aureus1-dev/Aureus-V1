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
 *
 * `textTertiary` (light) is `#675d4d` rather than the original `#8c8171`
 * for accessibility: the old value scored 3.58:1 on `surfacePrimary` and
 * only 2.82:1 on `surfaceTertiary`, failing WCAG AA (4.5:1) on all four
 * light surfaces — and 37 of its 44 usages are 12–14px text, so none
 * qualify for the large-text exemption. `#675d4d` is the lightest value
 * that clears 4.5:1 against every light surface (4.76:1 at worst), so it
 * preserves as much of the three-tier hierarchy as the standard permits.
 * The dark value is deliberately unchanged: it already passed everywhere
 * (4.75–5.62:1).
 *
 * The same correction was then required across the rest of the light
 * semantic set, once seeded pilot data made those tokens visible as
 * small text for the first time. Measured against all four light
 * surfaces, every one failed AA at 12–14px: opportunity 3.16, warning
 * 2.81, journey 2.83, information 3.29, success 3.63, actionPrimary
 * 4.28, error 4.35. Each moved to the lightest value that clears 4.5:1
 * on the darkest surface, so the palette darkens as little as the
 * standard permits. AUREUS-302 §ACCESSIBILITY governs: "WCAG AA
 * contrast... Accessibility is mandatory." That canon fixes the outcome
 * and encodes no palette values, and these remain the Brand Neutral
 * placeholders, so nothing here contradicts a ratified colour.
 *
 * Every dark value was measured too and every one already passed
 * (4.56–6.89:1), so the dark theme is untouched throughout.
 *
 * `actionPrimaryHover` moves with `actionPrimary` only to keep the hover
 * step visible; it is a button background, not small text.
 *
 * `emberCore`/`emberMid`/`emberTip` (Warm & Elemental identity direction,
 * Founder-approved): a three-stop gradient for the Steward's own presence
 * — the voice orb (`VoiceOrb.tsx`) — so it reads as a glow with real
 * depth rather than a flat colored circle. `emberCore` deliberately
 * matches `steward`/`actionPrimary` exactly rather than introducing a new
 * hue: the orb's glow and the Steward's identity color are the same
 * color, just given room to bloom.
 */
export const colorTokens = {
  light: {
    surfacePrimary: '#faf7f2',
    surfaceSecondary: '#f1ebe1',
    surfaceTertiary: '#e6dccc',
    surfaceSunken: '#ece3d3',
    textPrimary: '#2b241c',
    textSecondary: '#5c5245',
    textTertiary: '#675d4d',
    border: '#ddd0ba',
    borderSubtle: '#ece2d0',
    focusRing: '#a8481f',
    actionPrimary: '#9a4119',
    actionPrimaryHover: '#7d3414',
    actionSecondary: '#5c5245',
    success: '#356a43',
    warning: '#805206',
    error: '#a33529',
    information: '#4a627b',
    opportunity: '#73508f',
    journey: '#2f6a62',
    steward: '#a8481f',
    conversation: '#5c5245',
    emberCore: '#a8481f',
    emberMid: '#d97e3d',
    emberTip: '#f5c98a',
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
    emberCore: '#e08a52',
    emberMid: '#eba377',
    emberTip: '#ffd9ae',
  },
} as const;

export type ColorRole = keyof typeof colorTokens.light;
export type ThemeName = keyof typeof colorTokens;
