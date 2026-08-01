import { AureusMark } from './AureusMark';
import styles from './HallArchitecture.module.css';

/**
 * The Hall's built fabric — a rotunda.
 *
 * The member stands inside a circular room. Above them a dome rises to
 * an oculus, and the day comes in through it. Around them a drum wall
 * carries the openings into the rest of the house. Beneath them a stone
 * floor runs out in courses that converge on the Hearth.
 *
 * Every layer here is `aria-hidden` and empty. That is a hard rule, not
 * a convention: the environment may never hold information a member
 * could miss, and four tests assert it.
 *
 * ── Why a rotunda, and why it is built this way ────────────────────
 *
 * This was a flat wall with a window in it, and it read as a picture of
 * a room rather than a room. A flat wall gives the eye nothing to travel
 * along: no near, no far, and no reason for the gaze to end up anywhere
 * in particular.
 *
 * A rotunda answers all three at once, because a circle seen from inside
 * *is* perspective. Every course in the floor and every rib in the dome
 * converges on one point, and that point is the Hearth. The architecture
 * then does the work the canon asks of it — "The eye is gently guided
 * toward the Hearth" — without a single arrow, highlight or instruction.
 *
 * ── How it is drawn ────────────────────────────────────────────────
 *
 * Entirely in CSS, from gradients. No 3D engine, no canvas, no imagery;
 * AUREUS-201 §PERFORMANCE forbids all three. The whole method is that a
 * `conic-gradient` centred on the vanishing point gives true radial
 * convergence, and a `repeating-radial-gradient` with two radii gives
 * true elliptical recession — so one-point perspective is a native CSS
 * primitive, provided every centre is the same point. Every centre in
 * this file is the Hearth.
 *
 * Layers run back to front, and each is a plane the eye can separate:
 * sky, dome, drum, floor, foreground. Nothing here is a background.
 * Every part is the building.
 */
export function HallArchitecture() {
  return (
    <div className={styles.architecture} aria-hidden="true">
      {/* ── Above: the dome, and the day coming through it ──────── */}
      <div className={styles.dome}>
        {/* Ribs converging on the oculus, and the courses between them. */}
        <div className={styles.domeRibs} />
        <div className={styles.domeCourses} />
        {/* The shadow the dome casts on itself, deepest at the springing. */}
        <div className={styles.domeShade} />
      </div>

      {/* The oculus: the room's only daylight, and the reason it changes
          through the day. */}
      <div className={styles.oculus}>
        <div className={styles.sky} />
        {/* Growth over the rim, seen from beneath (AUREUS-006 §NATURE). */}
        <div className={styles.oculusGrowth} />
      </div>
      {/* What the oculus throws down into the room. */}
      <div className={styles.daylight} />

      {/* ── Around: the drum wall the thresholds are cut into ───── */}
      <div className={styles.drum}>
        {/* Plaster over stone, curving away at both ends. */}
        <div className={styles.drumCurve} />
      </div>

      {/*
        The Aureus Mark, set into the drum on the room's centre line,
        above and behind the Hearth: "permanently integrated into the
        architecture behind the Hearth. It reflects the firelight. It
        never becomes the fire."
      */}
      <div className={styles.markWall}>
        <AureusMark />
      </div>

      {/* Where the drum meets the floor. Curved, because the room is. */}
      <div className={styles.springLine} />

      {/* ── Beneath: the floor, in courses that converge ────────── */}
      <div className={styles.floor}>
        <div className={styles.floorCourses} />
        <div className={styles.floorRays} />
        {/* The pool the Hearth throws around itself, on the stone. */}
        <div className={styles.hearthPool} />
      </div>

      {/* ── Nearest the member: the piers they are standing between ── */}
      <div className={styles.foreground}>
        <div className={`${styles.pier} ${styles.pierLeft}`} />
        <div className={`${styles.pier} ${styles.pierRight}`} />
      </div>
    </div>
  );
}
