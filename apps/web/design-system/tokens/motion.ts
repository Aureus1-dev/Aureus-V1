/**
 * Motion tokens (FPB-006 §7, FPB-007). Every animation in the frontend
 * shall reference these tokens rather than hardcoded durations or easing
 * curves, and shall be suppressed per the reduced-motion preference.
 */
export const motionTokens = {
  duration: {
    instant: '0ms',
    fast: '120ms',
    base: '200ms',
    slow: '320ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  },
} as const;
