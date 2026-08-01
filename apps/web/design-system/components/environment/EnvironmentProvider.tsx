'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { EnvironmentalTime } from './environment.types';
import { getEnvironmentalTime, NEUTRAL_ENVIRONMENTAL_TIME } from './getEnvironmentalTime';
import { HALL_AT_REST, useHallWelcome } from './useHallWelcome';

export interface HallEnvironmentValue {
  /** The member's hour, as the Hall expresses it. */
  time: EnvironmentalTime;
  /** True once the browser has told us the member's real hour. */
  resolved: boolean;
  /**
   * How lit the Hall is, 0 → 1: candlelight for a room nobody has spoken
   * in yet, full light once a member is really here. See
   * `useHallWelcome`.
   */
  welcome: number;
}

const NEUTRAL: HallEnvironmentValue = {
  time: NEUTRAL_ENVIRONMENTAL_TIME,
  resolved: false,
  welcome: HALL_AT_REST,
};

const EnvironmentContext = createContext<HallEnvironmentValue>(NEUTRAL);

/**
 * How often the Hall re-reads the clock.
 *
 * The Hall now stays mounted for a whole session rather than being
 * rebuilt on every navigation, which is the point — but it means an
 * environment resolved once at mount would keep a member in the
 * afternoon at midnight. AUREUS-006 §TIME: "Time should be visible but
 * never oppressive… The passing of hours." A room that never notices
 * the evening is not a living home.
 *
 * A minute is far finer than the hour boundaries actually need, and
 * costs one comparison; the interval is cheap precisely because the
 * value only changes four times a day, so a re-render is rare.
 */
const CLOCK_INTERVAL_MS = 60_000;

/**
 * The single source of the Hall's environmental state.
 *
 * Nothing else in the application reads the clock. Before this existed,
 * `LivingHall` resolved the hour itself, which was correct while the
 * Hall was rebuilt per route and wrong the moment it became permanent:
 * one component owning the environment is what lets the room stay
 * mounted while the day moves through it.
 *
 * Server-rendered as the neutral afternoon (see `getEnvironmentalTime`)
 * so the first paint is a complete room rather than an unlit one waiting
 * on JavaScript, and so the server's markup and the browser's first
 * paint agree.
 *
 * Weather and season are named by AUREUS-006 and deliberately not
 * implemented here. They belong to this provider when they arrive; an
 * empty extension point is honest, a fabricated forecast is not.
 */
export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [time, setTime] = useState<EnvironmentalTime | null>(null);
  /*
   * Read here rather than in the Hall itself, deliberately. The room is
   * also composed by the opening sequence, by the session fallback and
   * by tests, none of which sit inside a conversation — and a Hall that
   * *requires* a conversation in order to be lit is a room that cannot
   * exist before anyone speaks, which is the opposite of the idea.
   *
   * Everything outside this provider gets the neutral environment, which
   * is candlelight: exactly the state the Hall should be in when nothing
   * has been said yet.
   */
  const welcome = useHallWelcome();

  useEffect(() => {
    const read = () => setTime(getEnvironmentalTime());
    read();
    const timer = setInterval(read, CLOCK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const value = useMemo<HallEnvironmentValue>(
    () => (time ? { time, resolved: true, welcome } : { ...NEUTRAL, welcome }),
    [time, welcome],
  );

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}

/**
 * The current environment.
 *
 * Total by design: a component rendered outside the provider — the
 * opening sequence, a test, a Storybook-style harness — receives the
 * neutral afternoon rather than nothing. The Hall can never find itself
 * without a state to render (AUREUS-201: the composition the server
 * renders is "complete and deliberate on its own").
 */
export function useEnvironment(): HallEnvironmentValue {
  return useContext(EnvironmentContext);
}
