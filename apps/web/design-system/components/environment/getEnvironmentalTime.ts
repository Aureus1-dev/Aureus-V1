import type { EnvironmentalTime } from './environment.types';

/**
 * The hour of the member's day, as the Hall expresses it.
 *
 * Pure and total: every hour maps to exactly one period, so the
 * environment can never find itself without a state to render. Kept
 * separate from any component so the boundaries can be asserted directly
 * rather than inferred from a rendered room.
 *
 * The boundaries follow AUREUS-006 §LIGHT rather than astronomical
 * accuracy — the canon describes how each part of the day should *feel*,
 * and 5am reads as morning to a person awake in it regardless of what
 * the sun is doing.
 */
export function getEnvironmentalTime(date: Date = new Date()): EnvironmentalTime {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * What the Hall renders before it knows the member's hour.
 *
 * The server has no access to the member's clock, and reading it during
 * render would make the server's markup and the browser's first paint
 * disagree. Rather than render nothing and resolve later — which would
 * show an unlit room for a frame — the Hall opens in its most neutral,
 * fully-composed condition and warms into the real hour after hydration.
 * Afternoon is that neutral: "clear, capable, stable", the state that
 * looks deliberate whatever time it actually is.
 */
export const NEUTRAL_ENVIRONMENTAL_TIME: EnvironmentalTime = 'afternoon';
