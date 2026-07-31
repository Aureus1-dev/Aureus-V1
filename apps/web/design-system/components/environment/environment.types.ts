/**
 * The Hall's environmental state.
 *
 * Aureus is experienced as a real place (AUREUS-006 §ARCHITECTURAL
 * PHILOSOPHY), and a real place has conditions — an hour of the day, a
 * season, weather beyond the windows. This file is the one shared
 * vocabulary for those conditions, so the architecture, the hearth and
 * the thresholds all read the same state rather than each inventing its
 * own.
 *
 * Only `EnvironmentalTime` is implemented today. Season and weather are
 * declared but deliberately unbuilt: AUREUS-006 describes both, and
 * committing to their shape now means adding them later is a matter of
 * filling in styling rather than restructuring the environment. Nothing
 * renders an unsupported claim in the meantime — an unset value simply
 * means "not modelled yet", never a guess about the member's real
 * weather.
 */

/**
 * The hour of the member's own day, as the environment expresses it
 * (AUREUS-006 §LIGHT: "Morning should feel hopeful. Afternoon should
 * feel productive. Evening should feel peaceful").
 *
 * Deliberately distinct from the application's light/dark theme. A
 * member reading in a dark theme at 9am is still arriving in the
 * morning; a member in a light theme at midnight is still arriving at
 * night. Environmental time describes the place, theme describes the
 * screen, and the two must never be conflated.
 */
export type EnvironmentalTime = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * How present the Steward is right now.
 *
 * The Steward is *related to* the hearth but is not the hearth (see
 * `HallHearth`): the hearth is the constant light of Aureus, and this is
 * the Steward's own response within it. Kept as a type rather than
 * guessed at from other state — AUREUS-004 §PRESENCE is explicit that
 * the Steward "never competes for attention", so a presence state must
 * be driven by something real, never invented to animate a screen.
 *
 * Only `resting` is driven today, because arrival has no live Steward
 * turn state to read. The rest exist so that the surfaces which *do*
 * have that state can adopt them without redesigning the hearth.
 */
export type StewardPresence =
  | 'resting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'attention';

/** Reserved: AUREUS-006 §SEASONS. Declared for shape only — nothing renders from it yet. */
export type EnvironmentalSeason = 'spring' | 'summer' | 'autumn' | 'winter';

/** Reserved: AUREUS-006 §WEATHER. Never inferred from a member's location, and never connected to an external service without an explicit decision to do so. */
export type EnvironmentalWeather = 'clear' | 'cloud' | 'rain' | 'snow' | 'fog';

export interface HallEnvironment {
  time: EnvironmentalTime;
  /** Unset until seasons are actually modelled. */
  season?: EnvironmentalSeason;
  /** Unset until weather is actually modelled. */
  weather?: EnvironmentalWeather;
}
