/**
 * Responsive breakpoint tokens (FPB-012 §5). Used both for CSS media
 * queries (values substituted at build/style time) and JS matchMedia
 * checks, since CSS custom properties cannot be interpolated into
 * @media conditions.
 */
export const breakpointTokens = {
  mobile: '0px',
  tablet: '640px',
  desktop: '1024px',
  wide: '1440px',
} as const;

export type BreakpointName = keyof typeof breakpointTokens;
