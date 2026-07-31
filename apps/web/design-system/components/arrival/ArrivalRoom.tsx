'use client';

import { useEffect, useState, type ReactNode } from 'react';
import styles from './ArrivalRoom.module.css';

/**
 * The light of the Hall follows the natural rhythm of the day
 * (AUREUS-006 §LIGHT: "Morning should feel hopeful. Afternoon should
 * feel productive. Evening should feel peaceful"). Night is folded in as
 * its own stillness rather than left as a harsher evening.
 */
export type Daylight = 'morning' | 'afternoon' | 'evening' | 'night';

export function daylightAt(date: Date): Daylight {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export interface ArrivalRoomProps {
  children: ReactNode;
}

/**
 * The Hall, made visible — the environmental shell the guided arrival
 * flow takes place inside, turning a flat padded form area into a place
 * a member arrives in (AUREUS-003 The Hall; AUREUS-006 Environmental
 * Design).
 *
 * Three environmental layers sit behind the member's actual business:
 *
 * - The light field (AUREUS-006 §LIGHT, "Light is Aureus' primary
 *   architectural material"): a soft, layered daylight that enters the
 *   room from above and drifts almost imperceptibly, warming or cooling
 *   with the real hour of the member's day. It guides attention toward
 *   the room's center without demanding it.
 * - The hearth (AUREUS-003 §ARCHITECTURE, "The Aureus Mark serves as the
 *   architectural center of the Hall"): the same ember that formed
 *   during the opening sequence, now at rest at the center of the room —
 *   the Mark and the Steward's presence are one and the same light, so
 *   the member is met by something they already recognize. Presence
 *   before instruction (AUREUS-003 §THE ROLE OF THE STEWARD).
 *
 * Whatever the member is currently doing goes inside, on an
 * `ArrivalStage` — restoring their session, waiting on their journey,
 * recovering from an error, or working through a step of arrival. All
 * of it happens in this one room, so arrival never feels like a series
 * of onboarding screens handing off to each other.
 *
 * Every environmental layer is `aria-hidden` and carries no information
 * of its own — atmosphere only. A member using a screen reader, or one
 * who prefers reduced motion, loses nothing but the atmosphere and still
 * receives the complete arrival (AUREUS-005 §ACCESSIBILITY: "Members who
 * prefer reduced motion should receive an equally complete experience").
 *
 * This component deliberately contains no arrival logic. It renders
 * whatever it is given and never influences it — the experiential layer
 * wraps the flow, it does not participate in it.
 *
 * The room itself has no entrance animation, deliberately. It is
 * rendered in three places along one arrival — the route's `loading`
 * segment, `AuthGate`'s session-restore fallback, and `WelcomeFlow` —
 * and React necessarily unmounts one to mount the next, since they sit
 * on opposite sides of the auth boundary. Anything that faded in would
 * therefore fade in several times and announce those boundaries as
 * repeated arrivals, which is precisely the seam this architecture
 * exists to remove. The Hall does not arrive; it is simply already
 * there, and only what stands on its stage ever changes. The cinematic
 * reveal of the Hall belongs to the opening sequence (`ArrivalScene`),
 * which plays once, before any of this.
 */
export function ArrivalRoom({ children }: ArrivalRoomProps) {
  // Resolved after mount, never during render: the server and the
  // member's browser can sit in different hours, and reading the clock
  // while rendering would make the markup they produce disagree. Until
  // it resolves, the room simply uses its neutral daylight.
  const [daylight, setDaylight] = useState<Daylight | null>(null);

  useEffect(() => {
    setDaylight(daylightAt(new Date()));
  }, []);

  return (
    <div className={styles.room} data-daylight={daylight ?? undefined}>
      <div className={styles.lightField} aria-hidden="true" />
      <div className={styles.hearth} aria-hidden="true" />
      {children}
    </div>
  );
}
