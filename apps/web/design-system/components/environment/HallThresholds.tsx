'use client';

import Link from 'next/link';
import { PLACE_IDS, PLACES, type PlaceId } from '../../navigation/places';
import { usePlace } from './PlaceProvider';
import styles from './HallThresholds.module.css';

/**
 * The six openings cut into the drum of the rotunda.
 *
 * Real passages, not painted arches. Each shows a glimpse of the room
 * beyond it and no more: a warmth, a colour, a suggestion of what is
 * happening in there. Founder directive: "Each threshold reveals only a
 * glimpse. The member should understand that an entire world exists
 * beyond… Do not fully reveal these places. The mystery is important."
 *
 * ── Why six openings but not six buttons ───────────────────────────
 *
 * All six are always *there*, because a house has all its rooms whether
 * or not you are going into them, and a Hall with two doors is not the
 * centre of anything. But they are architecture first: unlabelled,
 * uninteractive, and well below the Hearth in contrast. AUREUS-003
 * §VISUAL HIERARCHY allows the Hall one unmistakable focal point, and
 * six equal calls to action would be a menu wearing an architectural
 * costume.
 *
 * Only the ways the member can usefully go right now are lit and named:
 * home, and somewhere they have actually been. AUREA-002 §ORIENTATION —
 * "Members are never given a feature tour… The Steward introduces spaces
 * only when they become relevant." The rest stay openings a member can
 * see into and wonder about, which is exactly what makes "take me to the
 * Library" occur to them later.
 *
 * The way home is never absent while a member is elsewhere (AUREUS-005
 * non-negotiable: "Members should always know how to return home").
 *
 * ── Placement ──────────────────────────────────────────────────────
 *
 * Arranged around the drum as they would be around a real rotunda: two
 * near the centre line either side of the Hearth, two further out, two
 * at the room's turn where they are steeply foreshortened. Each carries
 * its own depth, so the pair nearest the edges read as further away.
 *
 * ── Accessibility ──────────────────────────────────────────────────
 *
 * An opening that leads somewhere is a real link with a real name, in
 * the tab order, inside a labelled `<nav>`. An opening that leads
 * nowhere yet is `aria-hidden` architecture — announcing a doorway a
 * member cannot walk through is worse than staying silent.
 */

/** Where each place sits around the drum, and how far away it reads. */
const BAYS: { id: PlaceId; className: string }[] = [
  { id: 'library', className: 'bayFarLeft' },
  { id: 'study', className: 'bayLeft' },
  { id: 'circle', className: 'bayNearLeft' },
  { id: 'workshop', className: 'bayNearRight' },
  { id: 'opportunity-center', className: 'bayRight' },
  { id: 'garden', className: 'bayFarRight' },
];

export function HallThresholds() {
  const { waysBack } = usePlace();
  const open = new Map(waysBack.map((place, index) => [place.id, index]));

  // The Hall itself is a way back, but it is not one of the six bays —
  // it is the room the member is standing in. It takes the nearest bay
  // on the left so the way home is always in the same place.
  const homeIsOffered = waysBack.some((place) => place.id === 'hall');

  // A `<nav>` with nothing in it is an empty landmark: a screen reader
  // announces navigation and then finds none. Where no way is open the
  // six openings are pure architecture, and say so.
  const Frame = waysBack.length > 0 ? 'nav' : 'div';
  const frameProps =
    waysBack.length > 0 ? { 'aria-label': 'Ways through' } : { 'aria-hidden': true as const };

  return (
    <Frame className={styles.thresholds} {...frameProps}>
      {BAYS.map(({ id, className }, index) => {
        const place = PLACES[id];
        const isHomeBay = homeIsOffered && index === 2;
        const target = isHomeBay ? PLACES.hall : place;
        const isOpen = isHomeBay || open.has(id);

        return (
          <div key={id} className={`${styles.bay} ${styles[className]}`} data-open={isOpen}>
            {/* The passage itself: reveal, depth, and the glimpse beyond. */}
            <span className={styles.reveal} aria-hidden="true">
              <span className={`${styles.beyond} ${styles[`beyond-${target.id}`]}`} />
            </span>

            {isOpen && target.entrance ? (
              <Link href={target.entrance} className={styles.way}>
                <span className={styles.name}>{target.name}</span>
              </Link>
            ) : null}
          </div>
        );
      })}
    </Frame>
  );
}
