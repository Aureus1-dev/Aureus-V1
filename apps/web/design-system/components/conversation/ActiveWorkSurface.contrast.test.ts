import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { colorTokens } from '../../tokens/color';

type Rgb = { r: number; g: number; b: number };
type Color = string | Rgb;

const SURFACE_ROLES = [
  'surfacePrimary',
  'surfaceSecondary',
  'surfaceTertiary',
  'surfaceSunken',
] as const;

const STATUS_TINTS = [
  ['information', 0.16],
  ['warning', 0.16],
  ['error', 0.14],
  ['success', 0.16],
  ['textSecondary', 0.12],
] as const;

const THEMES = [
  ['light', colorTokens.light],
  ['dark', colorTokens.dark],
] as const;

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) throw new Error(`Expected 6-digit hex color, received ${hex}`);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function asRgb(color: Color): Rgb {
  return typeof color === 'string' ? hexToRgb(color) : color;
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: Color): number {
  const { r, g, b } = asRgb(color);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

function contrastRatio(a: Color, b: Color): number {
  const lighter = Math.max(relativeLuminance(a), relativeLuminance(b));
  const darker = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

function blend(foreground: string, background: string, foregroundWeight: number): Rgb {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  return {
    r: fg.r * foregroundWeight + bg.r * (1 - foregroundWeight),
    g: fg.g * foregroundWeight + bg.g * (1 - foregroundWeight),
    b: fg.b * foregroundWeight + bg.b * (1 - foregroundWeight),
  };
}

function ruleBody(css: string, className: string): string {
  const match = css.match(new RegExp(`\\.${className}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) throw new Error(`Missing .${className} CSS rule`);
  return match[1];
}

describe('ActiveWorkSurface contrast contract', () => {
  const css = readFileSync(join(__dirname, 'ActiveWorkSurface.module.css'), 'utf8');

  it('keeps normal-size status and Needs-you words on the accessible primary text role', () => {
    expect(ruleBody(css, 'status')).toMatch(/color:\s*var\(--color-text-primary\)/);
    expect(ruleBody(css, 'needsYouLabel')).toMatch(/color:\s*var\(--color-text-primary\)/);
    expect(ruleBody(css, 'needsYouText')).toMatch(/color:\s*var\(--color-text-primary\)/);
  });

  it('keeps semantic status color as a secondary dot/tint cue, never as the text color', () => {
    expect(ruleBody(css, 'statusDot')).toMatch(/background:\s*var\(--status-accent/);

    for (const toneClass of [
      'toneActive',
      'toneAttention',
      'toneBlocked',
      'toneComplete',
      'toneNeutral',
    ]) {
      const toneRule = ruleBody(css, toneClass);
      expect(toneRule).toMatch(/--status-accent:/);
      expect(toneRule).not.toMatch(/(^|;)\s*color\s*:/m);
    }

    const needsYouRule = ruleBody(css, 'needsYou');
    expect(needsYouRule).toMatch(/border:[\s\S]*var\(--color-warning\)/);
    expect(needsYouRule).toMatch(/background:[\s\S]*var\(--color-warning\)/);
  });

  it('keeps textPrimary at WCAG AA normal-text contrast across both themes and Active Work tints', () => {
    for (const [themeName, theme] of THEMES) {
      for (const surfaceRole of SURFACE_ROLES) {
        const surface = theme[surfaceRole];

        expect(
          contrastRatio(theme.textPrimary, surface),
        ).toBeGreaterThanOrEqual(4.5);

        for (const [accentRole, weight] of STATUS_TINTS) {
          const tintedSurface = blend(theme[accentRole], surface, weight);
          const ratio = contrastRatio(theme.textPrimary, tintedSurface);
          if (ratio < 4.5) {
            throw new Error(
              `${themeName} textPrimary fails AA on ${accentRole} ${weight * 100}% tint over ${surfaceRole}: ${ratio.toFixed(2)}:1`,
            );
          }
        }

        const needsYouTint = blend(theme.warning, surface, 0.08);
        const needsYouRatio = contrastRatio(theme.textPrimary, needsYouTint);
        if (needsYouRatio < 4.5) {
          throw new Error(
            `${themeName} textPrimary fails AA on Needs-you warning tint over ${surfaceRole}: ${needsYouRatio.toFixed(2)}:1`,
          );
        }
      }
    }
  });
});
