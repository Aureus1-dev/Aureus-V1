/**
 * Elevation tokens (FPB-006 §3) expressed as box-shadow values. Warm-tinted
 * (matches `textPrimary`'s warm-charcoal hue rather than a cold near-black)
 * for the Living Steward Workspace's calm-hospitality visual language.
 */
export const elevationTokens = {
  0: 'none',
  1: '0 1px 2px rgba(43, 36, 28, 0.08)',
  2: '0 2px 6px rgba(43, 36, 28, 0.10)',
  3: '0 6px 16px rgba(43, 36, 28, 0.14)',
  4: '0 12px 32px rgba(43, 36, 28, 0.18)',
} as const;
