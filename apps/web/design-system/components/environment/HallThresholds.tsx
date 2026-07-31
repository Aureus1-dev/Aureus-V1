import styles from './HallThresholds.module.css';

/**
 * Quiet openings at the edges of the Hall, suggesting that the house
 * continues beyond this room.
 *
 * "From the Hall, members may naturally move toward places such as the
 * Steward's Study, the Library, the Circle, the Workshop, the
 * Opportunity Center, the Garden. These places should feel connected as
 * parts of one home, not as separate applications" (AUREUS-003
 * §ORGANIZATION).
 *
 * So these are not six navigation cards, and they are deliberately not
 * six equal calls to action — that would be a menu wearing an
 * architectural costume, and it would put six competing choices in front
 * of a member whose first question is whether anyone here can help them.
 * AUREUS-003 §VISUAL HIERARCHY is explicit that the Hall has "one
 * unmistakable focal point"; that is the hearth, and these stay
 * peripheral to it.
 *
 * They carry no labels and no interaction in this phase. They exist so
 * that a member's eye registers, without being told, that there is more
 * house than this room — which is what makes "take me to the Library"
 * feel like a reasonable thing to say later. The Steward remains the
 * guide (AUREUS-005 §STEWARD-LED NAVIGATION); the walls only imply.
 *
 * Entirely decorative and `aria-hidden`: a member using a screen reader
 * is not told about doorways they cannot yet walk through, because that
 * would be an announcement of something that does not work.
 */
export function HallThresholds() {
  return (
    <div className={styles.thresholds} aria-hidden="true">
      <div className={`${styles.threshold} ${styles.left}`}>
        <div className={styles.opening} />
      </div>
      <div className={`${styles.threshold} ${styles.right}`}>
        <div className={styles.opening} />
      </div>
    </div>
  );
}
