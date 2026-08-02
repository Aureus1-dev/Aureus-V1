'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The Hall waking because someone arrived.
 *
 * ── Why this is not an opening animation ───────────────────────────
 *
 * Founder direction: "I wouldn't think of it as an opening animation. I'd
 * think of it as the Hall waking up because you arrived."
 *
 * The distinction is the whole thing, and it is the difference between a
 * product performing for you and a place responding to you. An opening
 * animation is a film: it plays, you watch, and on the second visit you
 * skip it. A room waking is a fact about the room — it was here, unlit,
 * and your arrival is what changed it.
 *
 * Which is why this drives the *same* light the rest of the Hall uses
 * rather than being a separate cinematic with its own components,
 * timeline and exit. There is nothing to skip and nothing to hand over
 * from. The room is simply darker before you arrive than after.
 *
 * ── The stages ─────────────────────────────────────────────────────
 *
 * Held as one eased value, 0 → 1, so nothing has to stay in sync with a
 * timeline:
 *
 *   0.0s   asleep      Almost black. The Hearth is a shape. The Mark is
 *                      bronze in shadow. One candle, somewhere.
 *   1–2s   first light Light reaches the Mark. The bronze catches it —
 *                      the Mark does not begin to glow, the light
 *                      arrives. Nothing flashes.
 *   2–4s   catching    The fire takes. Small, warm, deliberate. It does
 *                      not burst into flame; fires do not.
 *   4–8s   the room    The rest of the candles, the depth, the far side.
 *                      Not revealed — simply lit enough to see.
 *
 * After that the conversation takes over (`useHallWelcome`) and the room
 * goes on brightening as the member speaks. Waking is about arriving.
 * Welcome is about being known. They multiply.
 *
 * ── Once per visit, not once per navigation ────────────────────────
 *
 * The Hall is permanent now, so this runs when it first mounts and never
 * again for the life of the session. Walking from the Library back to
 * the Hall must not re-play it: a room that wakes every time you enter
 * was never awake, and the member would learn that the Hall is a screen.
 */

/** How long the room takes to come up. Slow enough to be noticed, short
 *  enough that nobody in difficulty is made to wait through it. */
const WAKE_MS = 7600;

/** Where the room sits before the first frame: not black, but nearly. */
export const HALL_ASLEEP = 0.06;

export function useHallWaking(): number {
  const [awake, setAwake] = useState(HALL_ASLEEP);
  const started = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    // A member who has asked for reduced motion gets the room already
    // awake. AUREUS-005: they receive "an equally complete experience" —
    // and the complete experience of a lit room is the lit room, not a
    // shorter version of the lighting.
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const forced =
      typeof document !== 'undefined' &&
      document.documentElement.dataset.reducedMotion;

    if ((prefersReduced && forced !== 'false') || forced === 'true') {
      setAwake(1);
      return;
    }

    const step = (now: number) => {
      started.current ??= now;
      const elapsed = now - started.current;
      const t = Math.min(1, elapsed / WAKE_MS);
      // Eased so the first light is slow to arrive and the room settles
      // rather than snapping when it is full. A linear wake reads as a
      // progress bar, which is what a room must never look like.
      const eased = 1 - Math.pow(1 - t, 2.4);
      setAwake(HALL_ASLEEP + (1 - HALL_ASLEEP) * eased);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  return awake;
}
