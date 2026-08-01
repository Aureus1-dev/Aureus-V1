'use client';

import Link from 'next/link';
import { usePlace } from './PlaceProvider';
import styles from './HallThresholds.module.css';

/**
 * The openings at the edges of the Hall — the ways through to the rest
 * of the house.
 *
 * "From the Hall, members may naturally move toward places such as the
 * Steward's Study, the Library, the Circle, the Workshop, the
 * Opportunity Center, the Garden. These places should feel connected as
 * parts of one home, not as separate applications" (AUREUS-003
 * §ORGANIZATION). AUREUS-005 §INVISIBLE NAVIGATION: "The architecture
 * itself should provide guidance."
 *
 * ── Why these are not six doors ────────────────────────────────────
 *
 * They deliberately are not six equal calls to action. That would be a
 * menu wearing an architectural costume, and it would put six competing
 * choices in front of a member whose first question is whether anyone
 * here can help them. AUREUS-003 §VISUAL HIERARCHY allows the Hall "one
 * unmistakable focal point"; that is the hearth, and these stay
 * peripheral to it.
 *
 * So the room shows the way home, and a way back to somewhere this
 * member has actually been. Nothing else. AUREA-002 §ORIENTATION:
 * "Members are never given a feature tour… The Steward introduces spaces
 * only when they become relevant." Standing in the Hall with no history
 * yet, the openings are exactly what they have always been —
 * architecture, unlabelled and inert, suggesting only that there is more
 * house than this room. That is what makes "take me to the Library" feel
 * like a reasonable thing to say later.
 *
 * The way home is never absent while a member is elsewhere. AUREUS-005
 * non-negotiable: "Members should always know how to return home." With
 * the navigation rail gone, the architecture is what says so.
 *
 * Every other way to move is unaffected and remains primary: asking the
 * Steward, and the Index. This is the third way, and the quietest.
 *
 * ── Accessibility ──────────────────────────────────────────────────
 *
 * An opening that leads somewhere is a real link with a real name, in
 * the tab order, inside a labelled `<nav>`. An opening that leads
 * nowhere is `aria-hidden` decoration, because announcing a doorway a
 * member cannot walk through is worse than staying silent.
 */
export function HallThresholds() {
  const { waysBack } = usePlace();

  if (waysBack.length === 0) {
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

  const [first, second] = waysBack;

  return (
    <nav className={styles.thresholds} aria-label="Ways back">
      <div className={`${styles.threshold} ${styles.left}`}>
        <Link href={first.entrance!} className={styles.way}>
          <span className={styles.opening} aria-hidden="true" />
          <span className={styles.name}>{first.name}</span>
        </Link>
      </div>
      <div className={`${styles.threshold} ${styles.right}`}>
        {second ? (
          <Link href={second.entrance!} className={styles.way}>
            <span className={styles.opening} aria-hidden="true" />
            <span className={styles.name}>{second.name}</span>
          </Link>
        ) : (
          <span className={styles.opening} aria-hidden="true" />
        )}
      </div>
    </nav>
  );
}
