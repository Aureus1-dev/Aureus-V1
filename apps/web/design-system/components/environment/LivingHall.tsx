'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { EnvironmentalTime, StewardPresence } from './environment.types';
import { getEnvironmentalTime, NEUTRAL_ENVIRONMENTAL_TIME } from './getEnvironmentalTime';
import { HallArchitecture } from './HallArchitecture';
import { HallHearth } from './HallHearth';
import { HallThresholds } from './HallThresholds';
import styles from './LivingHall.module.css';

export interface LivingHallProps {
  /** Whatever the member is currently doing. Rendered on the stage, in front of the room. */
  children: ReactNode;
  /** The Steward's response within the hearth. Only `resting` is driven during arrival. */
  presence?: StewardPresence;
  /**
   * Overrides the resolved hour. For tests and for visual review of a
   * time of day other than the one the reviewer happens to be in — never
   * used to show a member an hour that is not theirs.
   */
  time?: EnvironmentalTime;
}

/**
 * The Hall: the living home of Aureus, and the environment the member is
 * standing inside rather than a panel they are looking at.
 *
 * This is the whole surface of the arrival experience. It is not a card,
 * not a modal, and not a region within a page — `LivingHall.module.css`
 * takes the full viewport and the routes that use it remove the shell's
 * padding, so there is no generic page visible behind the room. That
 * distinction is the difference between "an application with a themed
 * background" and "a place", and it is the reason this component exists
 * as its own thing rather than as styling on a container.
 *
 * Composition, from back to front (AUREUS-006 §ARCHITECTURAL PHILOSOPHY,
 * "Aureus is experienced as a real place"):
 *
 *   HallArchitecture — plaster wall, garden aperture, stone floor,
 *                      timber frame. Depth from stacked planes, not 3D.
 *   HallThresholds   — peripheral openings; the house continues.
 *   HallHearth       — the universal light of Aureus, set into the wall
 *                      at the centre. The one focal point.
 *   the stage        — the member's actual business, in front of it all.
 *
 * The order of importance is the reverse of the order of drawing, and
 * that is deliberate: the member's need comes first, the Steward second,
 * the interaction third, the environment fourth, decoration last. Every
 * choice here is subordinate to the content on the stage — the room may
 * never make the interaction harder to read.
 *
 * The Hall has no entrance animation of its own. It is rendered in
 * several places along one arrival, on both sides of the auth boundary,
 * so anything that faded in would fade in repeatedly and announce those
 * boundaries as fresh arrivals. The Hall does not arrive; it is already
 * there. The one true arrival — darkness, light, the Mark forming, the
 * room appearing around it — belongs to `ArrivalScene`, which plays once
 * and hands over to exactly this composition.
 */
export function LivingHall({ children, presence = 'resting', time }: LivingHallProps) {
  // The server cannot know the member's hour, and reading the clock
  // during render would make its markup disagree with the browser's
  // first paint. The Hall therefore opens in its neutral, fully-composed
  // afternoon and warms into the real hour after hydration — so the
  // first meaningful paint is already a finished room, never an unlit
  // one waiting on JavaScript.
  const [resolved, setResolved] = useState<EnvironmentalTime | null>(null);

  useEffect(() => {
    if (time) return;
    setResolved(getEnvironmentalTime());
  }, [time]);

  const environmentalTime = time ?? resolved ?? NEUTRAL_ENVIRONMENTAL_TIME;

  return (
    <div className={styles.hall} data-aureus-hall="" data-time={environmentalTime}>
      <HallArchitecture />
      <HallThresholds />
      <div className={styles.centre}>
        <HallHearth presence={presence} />
        <div className={styles.stageRegion}>{children}</div>
      </div>
    </div>
  );
}
