'use client';

import { useId } from 'react';
import styles from './AureusLight.module.css';

/**
 * The Aureus light — the institutional symbol of Aureus, rendered as
 * light within the Hearth.
 *
 * ── What this is, and what it is not ───────────────────────────────
 *
 * Founder ruling: "Aureus possesses one institutional Aureus Mark. Every
 * member possesses one unique Member's Mark. They are distinct concepts.
 * The institutional Mark is the permanent light of the Hall. The Member's
 * Mark represents the individual."
 *
 * So this is the institution's, not the member's. It is identical for
 * everyone, present before anyone has an account, and it never
 * personalises. The Member's Mark is a separate thing entirely, revealed
 * only when a member chooses to make Aureus their home (AUREUS-013).
 *
 * ── The temporary silhouette ───────────────────────────────────────
 *
 * Final artwork does not exist, and AUREUS-BP-001 is explicit: "Do not
 * delay implementation waiting for final artwork." This is the interim
 * canonical form, held to the constraints given — symmetrical, minimal,
 * recognisable small, renderable as light, free of ornament.
 *
 * It is an *aperture*: a flat sill and a round-headed arch, the same hand
 * that carved the hearth's recess and cut the window into the far wall.
 * That is deliberate. The blueprint asks for "an architectural aperture
 * or formed light rather than a generic circular orb", and an opening
 * that light comes through is the one form in this room that already
 * means something. A circle would have meant nothing, and would have
 * read as a status indicator.
 *
 * It is deliberately not: a notification dot, a flame, a location pin, a
 * microphone, a game artifact, or a symbol belonging to any one religious
 * tradition. Bilaterally symmetrical, no interior detail, no line work.
 *
 * ── Replacing it ───────────────────────────────────────────────────
 *
 * Everything about the Mark's form lives in this one file. Final artwork
 * replaces `APERTURE` — or replaces this component wholesale — and
 * nothing else in the Hall has to change: scale, placement, warmth and
 * the Steward's presence are all applied from outside.
 */

/**
 * A round-headed opening in a 64 × 96 field: sill along the base, walls
 * rising to the springing line, a semicircular head. One path, no
 * ornament.
 */
const APERTURE = 'M4 96 L4 36 A28 28 0 0 1 60 36 L60 96 Z';

export function AureusLight() {
  // Rendered in more than one place at once during arrival, and a
  // duplicated gradient id would make one of them inherit the other's
  // fill.
  const gradientId = useId();

  return (
    <svg
      className={styles.light}
      viewBox="0 0 64 96"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="66%" r="72%">
          <stop offset="0%" stopColor="var(--color-ember-tip)" stopOpacity="1" />
          <stop offset="42%" stopColor="var(--color-ember-mid)" stopOpacity="0.92" />
          <stop offset="78%" stopColor="var(--color-ember-core)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-ember-core)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={APERTURE} fill={`url(#${gradientId})`} />
    </svg>
  );
}
