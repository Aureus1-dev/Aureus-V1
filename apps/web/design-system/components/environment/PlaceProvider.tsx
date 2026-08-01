'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PLACES, placeForPath, type PlaceDefinition, type PlaceId } from '../../navigation/places';

export interface PlaceValue {
  /** Where the member is now, or `null` in housekeeping. */
  current: PlaceDefinition | null;
  /**
   * Other places the member has actually been this session, most recent
   * first. Not a menu of everywhere they could go — a record of where
   * they have been, which is what the architecture is allowed to show.
   */
  visited: PlaceDefinition[];
}

const EMPTY: PlaceValue = { current: null, visited: [] };

const PlaceContext = createContext<PlaceValue>(EMPTY);

/** How many places the room keeps a way back to. Two, because the Hall has two openings. */
const REMEMBERED = 2;

/**
 * Where the member is in the house, and where they have been.
 *
 * AUREUS-005 §ORIENTATION: members should always understand "Where they
 * are. How they arrived. What they can do here. How to return." The
 * first and the last of those need the room to know something the route
 * alone cannot say — which place this is, and which places already mean
 * something to this member.
 *
 * The history is deliberately of *visits*, not of everywhere that
 * exists. AUREA-002 §ORIENTATION: "Members are never given a feature
 * tour… The Steward introduces spaces only when they become relevant."
 * A room that offered six doorways the moment a member walked in would
 * be a menu wearing an architectural costume.
 *
 * Session-scoped, held in memory. It is not worth persisting: a member
 * returning tomorrow should arrive in the Hall, not resume a breadcrumb
 * trail, and the Hall "should never punish absence" (AUREUS-003).
 */
export function PlaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentId = placeForPath(pathname);
  const [visitedIds, setVisitedIds] = useState<PlaceId[]>([]);
  // The Hall is where everyone starts; it is not a place you "went to",
  // so it never enters the history on arrival — only if a member leaves
  // and comes back, which is exactly when a way back to it is useful.
  const seenAnywhereElse = useRef(false);

  useEffect(() => {
    if (!currentId) return;
    if (currentId !== 'hall') seenAnywhereElse.current = true;
    if (currentId === 'hall' && !seenAnywhereElse.current) return;

    setVisitedIds((previous) => {
      const next = [currentId, ...previous.filter((id) => id !== currentId)];
      return next.length === previous.length && next[0] === previous[0] ? previous : next;
    });
  }, [currentId]);

  const value = useMemo<PlaceValue>(() => {
    const visited = visitedIds
      .filter((id) => id !== currentId)
      .map((id) => PLACES[id])
      .filter((place) => place.entrance !== null)
      .slice(0, REMEMBERED);
    return { current: currentId ? PLACES[currentId] : null, visited };
  }, [currentId, visitedIds]);

  return <PlaceContext.Provider value={value}>{children}</PlaceContext.Provider>;
}

/**
 * The member's place in the house.
 *
 * Total: outside the provider — the opening sequence, a test — this is
 * an empty house rather than a crash, and the Hall simply shows no ways
 * through, which is what it did before any of this existed.
 */
export function usePlace(): PlaceValue {
  return useContext(PlaceContext);
}
