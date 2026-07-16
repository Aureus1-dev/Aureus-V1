/**
 * Z-index layer tokens (FPB-006 §3). Centralized to prevent ad hoc
 * stacking-order conflicts as new surfaces are introduced.
 */
export const zIndexTokens = {
  base: 0,
  stickyNav: 100,
  overlay: 200,
  modal: 300,
  toast: 400,
} as const;
