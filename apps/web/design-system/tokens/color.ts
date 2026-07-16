/**
 * Color role tokens (FPB-006 §3-4).
 *
 * Values are intentionally neutral placeholders per the Brand Neutral
 * Foundation amendment to FWO-001. No official Aureus palette is encoded
 * here. Replacing these values is the entire surface area required to
 * apply the finalized brand — no component should ever reference a raw
 * color value directly.
 */
export const colorTokens = {
  light: {
    surfacePrimary: '#ffffff',
    surfaceSecondary: '#f4f5f7',
    surfaceTertiary: '#e8eaee',
    textPrimary: '#1a1d23',
    textSecondary: '#4a4f58',
    textTertiary: '#767b85',
    border: '#d7dae0',
    focusRing: '#2f6fed',
    actionPrimary: '#2f6fed',
    actionPrimaryHover: '#265cc4',
    actionSecondary: '#4a4f58',
    success: '#1f8a55',
    warning: '#b5750a',
    error: '#c0362c',
    information: '#2f6fed',
    opportunity: '#8a5cc4',
    journey: '#1f8a8a',
    steward: '#2f6fed',
    conversation: '#4a4f58',
  },
  dark: {
    surfacePrimary: '#14161b',
    surfaceSecondary: '#1c1f26',
    surfaceTertiary: '#262a33',
    textPrimary: '#f4f5f7',
    textSecondary: '#c3c7cf',
    textTertiary: '#8b909b',
    border: '#343945',
    focusRing: '#6fa0ff',
    actionPrimary: '#6fa0ff',
    actionPrimaryHover: '#8fb6ff',
    actionSecondary: '#c3c7cf',
    success: '#4cbf85',
    warning: '#e0a53d',
    error: '#e2685e',
    information: '#6fa0ff',
    opportunity: '#b28ee0',
    journey: '#4cbdbd',
    steward: '#6fa0ff',
    conversation: '#c3c7cf',
  },
} as const;

export type ColorRole = keyof typeof colorTokens.light;
export type ThemeName = keyof typeof colorTokens;
