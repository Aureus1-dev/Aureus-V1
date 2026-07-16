import {
  breakpointTokens,
  colorTokens,
  elevationTokens,
  motionTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
  zIndexTokens,
  type ThemeName,
} from '../tokens';

function kebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function colorVariables(theme: ThemeName): string {
  return Object.entries(colorTokens[theme])
    .map(([role, value]) => `  --color-${kebabCase(role)}: ${value};`)
    .join('\n');
}

/**
 * Generates the CSS custom-property layer from the token architecture.
 * This is the single point where token values become styling reality —
 * every visual property in the component library shall reference one of
 * these variables rather than a literal value (FPB-006 §1).
 */
export function buildThemeCss(): string {
  const sharedVariables = [
    `  --font-family-base: ${typographyTokens.fontFamilyBase};`,
    `  --font-family-mono: ${typographyTokens.fontFamilyMono};`,
    ...Object.entries(typographyTokens.fontSize).map(
      ([step, value]) => `  --font-size-${step}: ${value};`,
    ),
    ...Object.entries(typographyTokens.fontWeight).map(
      ([step, value]) => `  --font-weight-${step}: ${value};`,
    ),
    ...Object.entries(typographyTokens.lineHeight).map(
      ([step, value]) => `  --line-height-${step}: ${value};`,
    ),
    ...Object.entries(typographyTokens.letterSpacing).map(
      ([step, value]) => `  --letter-spacing-${step}: ${value};`,
    ),
    ...Object.entries(spacingTokens).map(
      ([step, value]) => `  --space-${step}: ${value};`,
    ),
    ...Object.entries(motionTokens.duration).map(
      ([step, value]) => `  --motion-duration-${step}: ${value};`,
    ),
    ...Object.entries(motionTokens.easing).map(
      ([step, value]) => `  --motion-easing-${step}: ${value};`,
    ),
    ...Object.entries(elevationTokens).map(
      ([step, value]) => `  --elevation-${step}: ${value};`,
    ),
    ...Object.entries(radiusTokens).map(
      ([step, value]) => `  --radius-${step}: ${value};`,
    ),
    ...Object.entries(zIndexTokens).map(
      ([step, value]) => `  --z-${kebabCase(step)}: ${value};`,
    ),
    ...Object.entries(breakpointTokens).map(
      ([step, value]) => `  --breakpoint-${step}: ${value};`,
    ),
  ].join('\n');

  return `:root {\n${sharedVariables}\n${colorVariables('light')}\n}\n\n[data-theme='dark'] {\n${colorVariables('dark')}\n}\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme='light']) {\n${colorVariables('dark')}\n  }\n}\n\n[data-reduced-motion='true'] {\n  --motion-duration-instant: 0ms;\n  --motion-duration-fast: 0ms;\n  --motion-duration-base: 0ms;\n  --motion-duration-slow: 0ms;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  :root:not([data-reduced-motion='false']) {\n    --motion-duration-instant: 0ms;\n    --motion-duration-fast: 0ms;\n    --motion-duration-base: 0ms;\n    --motion-duration-slow: 0ms;\n  }\n}\n`;
}
