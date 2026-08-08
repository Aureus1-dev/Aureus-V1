'use client';

import { useId } from 'react';
import styles from './AureusMark.module.css';

/**
 * The Aureus Mark — the institution's enduring symbol, set into the wall
 * of the Hall behind the Hearth.
 *
 * ── The relationship this component exists to hold ─────────────────
 *
 * Founder directive: "The Aureus Mark remains permanently integrated
 * into the architecture behind the Hearth. It reflects the firelight. It
 * never becomes the fire. The relationship is intentional: The Hearth is
 * living. The Mark is enduring. Together they express Aureus."
 *
 * An earlier implementation put the Mark *inside* the hearth, as the
 * flame itself. That collapsed two things the canon keeps apart: the
 * fire is alive and moves, and the Mark does not. A Mark that flickers
 * is not enduring, and a fire that is a logo is not a fire.
 *
 * So the Mark is masonry. It is lit *by* the hearth — its warmth rises
 * and falls with the fire below it, one beat behind, because that is
 * what reflected light does — but it never generates light of its own
 * and never moves.
 *
 * ── Two lights ─────────────────────────────────────────────────────
 *
 * Founder directive: the light should "reflect off of it in different
 * ways", and "reflect differently from the time of day".
 *
 * There are exactly two lights in this room that can reach the Mark, and
 * they arrive from opposite directions: daylight down through the
 * oculus, firelight up from the Hearth. So the Mark is drawn three
 * times — the bronze itself, then the daylight falling on it, then the
 * firelight rising onto it — and the hour decides how much of each.
 *
 * That is why nothing here fades. At noon the highlight sits along the
 * top of the ring and the underside falls away; by midnight the fire is
 * the only light left and the weight has moved down onto the underside.
 * Same bronze, same paths, different reading.
 *
 * Measured on the dark theme, the luminance difference between the top
 * third of the Mark and the bottom third travels from −11.9 at morning
 * to −3.5 at night: the underside gains roughly eight points on the top
 * across the day. It does not fully invert, and deliberately so — the
 * daylight never goes to nothing, because a Mark lit only from below is
 * a Mark whose upper arc has gone missing, and this one is the member's
 * primary orientation. It has to stay whole at every hour.
 *
 * It is not the Member's Mark. AUREUS-013 and DOCUMENT 24: that one is
 * personal, unique to each member, and revealed only when a member
 * chooses to make Aureus their home. This one belongs to the house and
 * is identical for everyone who ever stands here.
 *
 * ── The temporary silhouette ───────────────────────────────────────
 *
 * Final artwork does not exist and the directive is explicit that
 * implementation must not wait for it. This is the interim canonical
 * form, taken from the Founder's reference image: a ring, and within it
 * a pointed leaf-form enclosing a small flame — symmetrical about the
 * vertical, minimal, no line work beyond the outline, recognisable at
 * the size it reaches on a phone.
 *
 * Its entire form is the three path constants below. Final artwork
 * replaces them and nothing else in the Hall changes: placement, scale
 * and the way the firelight reaches it are all applied from outside.
 */

/** The ring the Mark is set within. */
const RING = 'M60 6 A54 54 0 1 1 59.9 6 Z';

/** The leaf-form: two arcs meeting at a point above and below. */
const LEAF = 'M60 24 C78 44 86 58 86 70 C86 84 74 94 60 94 C46 94 34 84 34 70 C34 58 42 44 60 24 Z';

/** The flame held within it. */
const FLAME = 'M60 48 C68 58 71 64 71 71 C71 78 66 83 60 83 C54 83 49 78 49 71 C49 64 52 58 60 48 Z';

export interface AureusMarkProps {
  /**
   * Whether the wordmark and promise are carved beneath the Mark.
   *
   * Off in the Hall, and deliberately. The environment carries no
   * readable content — every layer of it is `aria-hidden`, and the room
   * must never hold information a member could miss, which is asserted
   * by test. Carving the promise into the wall put real words into that
   * layer for the first time.
   *
   * Nothing is lost: the arrival sequence speaks the same line aloud, as
   * content, at the moment it means the most. A wall that repeats it
   * permanently would be saying it to no one.
   */
  inscribed?: boolean;
}

export function AureusMark({ inscribed = false }: AureusMarkProps) {
  // The Mark can appear more than once at a time during arrival, and a
  // duplicated gradient id would make one instance inherit the other's.
  const glowId = useId();
  const dayId = useId();
  const fireId = useId();

  return (
    <div className={styles.mark} aria-hidden="true">
      <svg
        className={styles.glyph}
        viewBox="0 0 120 120"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <defs>
          <radialGradient id={glowId} cx="50%" cy="62%" r="60%">
            <stop offset="0%" stopColor="var(--color-ember-tip)" stopOpacity="0.34" />
            <stop offset="70%" stopColor="var(--color-ember-core)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--color-ember-core)" stopOpacity="0" />
          </radialGradient>

          {/*
           * Daylight, falling from the oculus. Strong at the top of the
           * form and gone by the bottom, because that is where it comes
           * from. Its colour is set by the hour (see the stylesheet) —
           * the same bronze is pale at eight in the morning and amber at
           * seven in the evening, and it is the light that changed, not
           * the metal.
           */}
          <linearGradient id={dayId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mark-daylight)" stopOpacity="0.95" />
            <stop offset="52%" stopColor="var(--mark-daylight)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--mark-daylight)" stopOpacity="0" />
          </linearGradient>

          {/*
           * Firelight, rising from the Hearth. The exact inverse: bright
           * along the underside, nothing along the top. When the two
           * trade places the whole Mark reads differently without a
           * single path moving — which is the point. A lamp below an
           * object does not dim it, it re-shades it.
           */}
          <linearGradient id={fireId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--color-ember-tip)" stopOpacity="1" />
            <stop offset="42%" stopColor="var(--color-ember-mid)" stopOpacity="0.42" />
            <stop offset="100%" stopColor="var(--color-ember-mid)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* What the fire below throws onto the stone. */}
        <circle cx="60" cy="60" r="58" fill={`url(#${glowId})`} />

        {/* The bronze itself: what you can see of it in no light at all. */}
        <path d={RING} className={styles.ring} />
        <path d={LEAF} className={styles.leaf} />
        <path d={FLAME} className={styles.flame} />

        {/*
         * Above. Still — daylight does not flicker.
         *
         * Each light is applied twice: along the edges of the metal,
         * where a band of bronze catches a hard highlight, and across
         * the face of the leaf, where it washes. Edge and face, because
         * that is how light actually meets a raised inlay, and because
         * an edge alone is a line drawing.
         */}
        <g className={styles.sheenAbove} stroke={`url(#${dayId})`}>
          <path d={LEAF} className={styles.wash} fill={`url(#${dayId})`} />
          <path d={RING} />
          <path d={LEAF} />
        </g>

        {/* Below. Moving, one long beat behind the fire that causes it. */}
        <g className={styles.sheenBelow} stroke={`url(#${fireId})`}>
          <path d={LEAF} className={styles.wash} fill={`url(#${fireId})`} />
          <path d={RING} />
          <path d={LEAF} />
          <path d={FLAME} />
        </g>
      </svg>

      {inscribed ? (
        <div className={styles.inscription}>
          <p className={styles.wordmark}>Aureus</p>
          <p className={styles.promise}>Helping people flourish. Forever.</p>
        </div>
      ) : null}
    </div>
  );
}
