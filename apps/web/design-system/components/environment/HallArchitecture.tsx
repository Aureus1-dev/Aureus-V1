import { AureusMark } from './AureusMark';
import styles from './HallArchitecture.module.css';

/**
 * The built fabric of the Hall: the surfaces a member is standing among
 * rather than looking at.
 *
 * Every layer here is `aria-hidden` and empty. That is a hard rule, not
 * a convenience — AUREUS-006 §TECHNOLOGY asks that members "experience
 * stewardship rather than software", which cuts both ways: the room may
 * never carry information a member could miss, so nothing in this file
 * is allowed to mean anything. Read the Hall with a screen reader and it
 * is silent; the interaction on the stage is the whole content.
 *
 * Depth is built from stacked planes rather than perspective or 3D. A
 * back wall, a floor that meets it at a shallow horizon, a timber frame
 * standing in front of both, and an aperture onto the garden — four
 * layers at four distances is enough for the eye to read a room, and it
 * costs nothing but CSS. AUREUS-006 asks for materials that "age
 * gracefully" and light as the primary material; it does not ask for a
 * render.
 *
 * This component holds no logic and no state. It is given a time of day
 * by `LivingHall` through a data attribute on the container and responds
 * to it entirely in CSS.
 */
export function HallArchitecture() {
  return (
    <div className={styles.architecture} aria-hidden="true">
      {/* Background: the far wall, warm plaster catching the day's light. */}
      <div className={styles.rearWall} />
      {/*
        The Aureus Mark, set into that wall above the Hearth. It is part
        of the building, not part of the fire: "permanently integrated
        into the architecture behind the Hearth. It reflects the
        firelight. It never becomes the fire."
      */}
      <div className={styles.markWall}>
        <AureusMark />
      </div>
      {/* The opening onto the garden — the one place daylight actually enters. */}
      <div className={styles.aperture}>
        <div className={styles.apertureLight} />
        <div className={styles.foliage} />
      </div>
      {/* Middle ground: where wall meets floor. A shallow horizon, low in
          the frame, so the member reads as standing in the room rather
          than looking down into a diagram of one. */}
      <div className={styles.horizon} />
      <div className={styles.floor} />
      {/* Foreground: the timber structure nearest the member. Its uprights
          are what give the room its scale. */}
      <div className={styles.frame}>
        <div className={styles.postLeft} />
        <div className={styles.postRight} />
        <div className={styles.beam} />
      </div>
      {/* Overhead wash — light implied above rather than a drawn ceiling. */}
      <div className={styles.ceilingWash} />
    </div>
  );
}
