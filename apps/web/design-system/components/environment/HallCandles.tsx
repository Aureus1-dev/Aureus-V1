import styles from './HallCandles.module.css';

/**
 * The candles the Hall keeps burning.
 *
 * Founder directive: as a member enters it should be "candle lit,
 * flickering candles, warmth" — and then the room brightens as they
 * speak.
 *
 * These are what make the waiting room feel *tended* rather than merely
 * dark. A dark room is empty. A dark room with candles in it is a room
 * someone lit before you got there, and that difference is the whole
 * emotional premise of the Hall: this place was prepared for you.
 *
 * ── Why each one flickers on its own ───────────────────────────────
 *
 * Nine candles, on nine periods that share no common factor. That is the
 * entire trick: flames driven by one timing read instantly as a repeating
 * animation, and flames on coprime periods never resolve into a pattern
 * a member can catch. The room stops looping and starts breathing.
 *
 * They are placed around the drum, not scattered — on the ledges either
 * side of the Hearth and along the seating, further apart and dimmer
 * toward the room's turn, so their spacing carries the same perspective
 * the floor does.
 *
 * They recede rather than go out as the room brightens: a candle in a
 * fully lit room is still burning, it is simply no longer what you see
 * by. Nothing here is ever extinguished.
 */

/** Nine candles: position across the drum, height, and flicker period. */
const CANDLES = [
  { left: '9%', top: '46%', scale: 0.62, period: 2300, delay: 0 },
  { left: '17%', top: '49%', scale: 0.78, period: 3100, delay: 420 },
  { left: '27%', top: '45%', scale: 0.7, period: 2700, delay: 900 },
  { left: '36%', top: '50%', scale: 0.9, period: 3700, delay: 260 },
  { left: '50%', top: '43%', scale: 0.66, period: 4100, delay: 1500 },
  { left: '64%', top: '50%', scale: 0.9, period: 2900, delay: 700 },
  { left: '73%', top: '45%', scale: 0.7, period: 3300, delay: 1200 },
  { left: '83%', top: '49%', scale: 0.78, period: 2500, delay: 180 },
  { left: '91%', top: '46%', scale: 0.62, period: 3900, delay: 1900 },
];

export function HallCandles() {
  return (
    <div className={styles.candles} aria-hidden="true">
      {CANDLES.map((candle, index) => (
        <span
          key={index}
          className={styles.candle}
          style={
            {
              left: candle.left,
              top: candle.top,
              '--candle-scale': candle.scale,
              '--candle-period': `${candle.period}ms`,
              '--candle-delay': `${candle.delay}ms`,
            } as React.CSSProperties
          }
        >
          <span className={styles.flame} />
          <span className={styles.halo} />
        </span>
      ))}
    </div>
  );
}
