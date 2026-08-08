'use client';

import { useId } from 'react';
import styles from './AureusLight.module.css';

/**
 * The fire in the Hearth.
 *
 * ── What this is, and what it is not ───────────────────────────────
 *
 * Founder directive: "The Hearth is the living heart of Aureus. It
 * represents presence. Not technology. Not AI. Presence. The fire is
 * alive. It breathes naturally… Never dramatically. Never theatrically.
 * Never magically."
 *
 * This is the fire, and only the fire. It is emphatically *not* the
 * Aureus Mark — an earlier implementation rendered the Mark here, as the
 * flame itself, and that collapsed the one relationship the canon is
 * most careful about: "The Aureus Mark remains permanently integrated
 * into the architecture behind the Hearth. It reflects the firelight. It
 * never becomes the fire. The Hearth is living. The Mark is enduring."
 *
 * The Mark now lives where it belongs, in the wall behind (`AureusMark`).
 * A fire that is a logo is not a fire, and a Mark that flickers is not
 * enduring.
 *
 * ── The form ───────────────────────────────────────────────────────
 *
 * A flame, drawn the way flame actually is: broad and unsteady at the
 * base where it is fed, narrowing to a point. Two forms rather than one,
 * an outer body and an inner core, because a single silhouette reads as
 * a shape and two overlapping ones read as depth.
 *
 * Deliberately not: a notification dot, a location pin, a microphone, a
 * game artifact, or an emoji flame. Nothing here flashes.
 */

/** The body of the flame: wide at the base, drawn to a point. */
const FLAME_BODY =
  'M32 6 C42 24 52 36 52 50 C52 66 43 76 32 76 C21 76 12 66 12 50 C12 36 22 24 32 6 Z';

/** The core, seated low, where the fire is hottest. */
const FLAME_CORE =
  'M32 34 C38 46 42 52 42 58 C42 68 37 74 32 74 C27 74 22 68 22 58 C22 52 26 46 32 34 Z';

export function AureusLight() {
  // Rendered in more than one place at once during arrival, and a
  // duplicated gradient id would make one of them inherit the other's
  // fill.
  const gradientId = useId();

  return (
    <svg
      className={styles.light}
      viewBox="0 0 64 84"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="78%" r="70%">
          <stop offset="0%" stopColor="var(--color-ember-tip)" stopOpacity="0.95" />
          <stop offset="45%" stopColor="var(--color-ember-mid)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--color-ember-core)" stopOpacity="0.25" />
        </radialGradient>
      </defs>
      <path d={FLAME_BODY} className={styles.body} fill={`url(#${gradientId})`} />
      <path d={FLAME_CORE} className={styles.core} />
    </svg>
  );
}
