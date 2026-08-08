'use client';

import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import type { EnvironmentalTime, StewardPresence } from './environment.types';
import { useEnvironment } from './EnvironmentProvider';
import { HallArchitecture } from './HallArchitecture';
import { HallCandles } from './HallCandles';
import { HallHearth } from './HallHearth';
import { HallThresholds } from './HallThresholds';
import styles from './LivingHall.module.css';

/**
 * Whether a Hall is already standing above this point in the tree.
 *
 * Arrival mounts the room from several places — the root route, the
 * session fallback, the welcome flow, a route's loading segment. Now
 * that the member layout keeps one Hall permanently, those call sites
 * must not build a second one inside it. Rather than editing each of
 * them to know where they are, `ArrivalRoom` asks.
 */
const InsideHallContext = createContext(false);

/** True when the caller is already standing inside a Hall. */
export function useInsideHall(): boolean {
  return useContext(InsideHallContext);
}

export interface HallFrameProps {
  /**
   * What must appear above the room rather than inside it. The guest
   * banner is the only such thing: it carries a full sentence of copy, it
   * is not part of the architecture, and a member should never have to
   * scroll a room to find it.
   */
  above?: ReactNode;
  /** The Hall. */
  children: ReactNode;
}

/**
 * The frame the Hall stands in.
 *
 * Exists for one reason: something occasionally has to sit above the room
 * without pushing it off the bottom of the viewport. A column of exactly
 * one viewport, with the room taking whatever is left, keeps the document
 * from ever growing taller than the screen — which is what would
 * otherwise carry the hearth away when a member scrolled, and the
 * Founder's invariant does not allow that.
 */
export function HallFrame({ above, children }: HallFrameProps) {
  return (
    <div className={styles.frame}>
      {above}
      {children}
    </div>
  );
}

export interface LivingHallProps {
  /** Whatever the member is currently doing. Rendered on the stage, beneath the hearth. */
  children: ReactNode;
  /** The Steward's response within the hearth. Only `resting` is driven during arrival. */
  presence?: StewardPresence;
  /**
   * Overrides the resolved hour. For tests and for visual review of a
   * time of day other than the one the reviewer happens to be in — never
   * used to show a member an hour that is not theirs.
   */
  time?: EnvironmentalTime;
  /**
   * Set while the transitional application chrome is still mounted over
   * the room, so the member's column clears it. Removed with the chrome
   * itself; see `LivingHall.module.css`.
   */
  chrome?: 'shell';
}

/**
 * The Hall: the living home of Aureus, and the environment the member is
 * standing inside rather than a panel they are looking at.
 *
 * ── The Hall is the application ────────────────────────────────────
 *
 * This component is mounted once, in the member layout, and does not
 * unmount for the life of the session. That is not an optimisation; it
 * is the architecture. AUREUS-201 §IMPLEMENTATION OBJECTIVE: "The
 * implementation shall create a continuous architectural environment
 * that replaces the traditional concept of application pages… The Hall
 * remains present throughout the member experience. Only the current
 * interaction changes." DOCUMENT 12, constitutional: the Hall "is not an
 * application launcher", and its first design principle is
 * "Architecture before interface."
 *
 * Previously the Hall rendered *inside* the shell's `<main>` on two
 * routes, which made the environment a region of the interface and meant
 * it was destroyed and rebuilt on every navigation. A room that is
 * rebuilt whenever you walk through it is a background image, not a
 * place.
 *
 * Composition, from back to front (AUREUS-006 §ARCHITECTURAL PHILOSOPHY,
 * "Aureus is experienced as a real place"):
 *
 *   HallArchitecture — plaster wall, garden aperture, stone floor,
 *                      timber frame. Depth from stacked planes, not 3D.
 *   HallThresholds   — peripheral openings; the house continues.
 *   HallHearth       — the permanent light of the Hall, set into the
 *                      wall at the centre. The one focal point.
 *   the stage        — the member's actual business, beneath it.
 *
 * The order of importance is the reverse of the order of drawing, and
 * that is deliberate: the member's need comes first, the Steward second,
 * the interaction third, the environment fourth, decoration last. Every
 * choice here is subordinate to the content on the stage — the room may
 * never make the interaction harder to read.
 *
 * The hearth is rendered as a sibling of the stage rather than behind
 * it, which is what makes the Founder's Hearth invariant structural: no
 * content, on any route, at any length, can cover it (see
 * `HallStage.module.css`).
 *
 * The Hall has no entrance animation of its own. It is now literally
 * permanent, so anything that faded in would either play once and never
 * again or announce every navigation as a fresh arrival. The Hall does
 * not arrive; it is already there. The one true arrival — darkness,
 * light, the room appearing around it — belongs to `ArrivalScene`, which
 * plays once and hands over to exactly this composition.
 */
export function LivingHall({ children, presence = 'resting', time, chrome }: LivingHallProps) {
  const environment = useEnvironment();
  const environmentalTime = time ?? environment.time;

  /*
   * How lit the room is, from candlelight to fully welcomed. Republished
   * as a custom property rather than passed down, because almost every
   * surface in the Hall responds to it — the plaster, the candles, the
   * depth of the shadows — and threading a number through six components
   * would have meant six chances to forget one.
   */
  const welcome = environment.welcome;

  return (
    <InsideHallContext.Provider value={true}>
      <div
        className={styles.hall}
        data-aureus-hall=""
        data-time={environmentalTime}
        data-chrome={chrome}
        style={{ '--hall-welcome': welcome, '--hall-awake': environment.awake } as CSSProperties}
      >
        <HallArchitecture />
        <HallThresholds />
        <HallCandles />
        <div className={styles.centre}>
          <div className={styles.crown}>
            <HallHearth presence={presence} />
          </div>
          {children}
        </div>
      </div>
    </InsideHallContext.Provider>
  );
}
