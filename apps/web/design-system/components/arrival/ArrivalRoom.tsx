'use client';

import type { ReactNode } from 'react';
import { LivingHall, useInsideHall } from '../environment';

export interface ArrivalRoomProps {
  children: ReactNode;
}

/**
 * The Hall, as arrival refers to it.
 *
 * Arrival mounts the room from four places: the root route, the session
 * fallback, the welcome flow, and the welcome route's own loading
 * segment. Every one of them predates the Hall being permanent, and
 * every one of them still calls this component with the same props and
 * the same behaviour — which is exactly the point. Turning the
 * environment into the application changed no arrival logic whatsoever.
 *
 * What changed is that inside the member layout a Hall is now always
 * already standing. Building a second one within it would nest a fixed
 * full-viewport room inside another: two floors, two hearths, a stage
 * inside a stage. So this asks where it is. Inside the Hall it steps
 * aside and hands its children to the stage already there; outside it —
 * the root route lives above the member layout and has no Hall of its
 * own — it raises the room exactly as before.
 *
 * Asking is deliberately better than editing the four call sites to
 * know: a fifth will be written one day by someone unaware this rule
 * exists, and it will be correct anyway.
 */
export function ArrivalRoom({ children }: ArrivalRoomProps) {
  const insideHall = useInsideHall();
  if (insideHall) return <>{children}</>;
  return <LivingHall>{children}</LivingHall>;
}
