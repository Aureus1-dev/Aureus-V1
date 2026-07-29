/**
 * Border radius tokens (FPB-006 §3).
 */
export const radiusTokens = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  /** Room/panel containers — softer than `lg`, which stays as-is for cards. */
  xl: '1.25rem',
  full: '999px',
} as const;
