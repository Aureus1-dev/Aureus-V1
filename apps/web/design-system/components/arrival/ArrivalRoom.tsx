'use client';

import type { ReactNode } from 'react';
import { LivingHall } from '../environment';

export interface ArrivalRoomProps {
  children: ReactNode;
}

/**
 * The Hall, as arrival refers to it.
 *
 * The room itself is `LivingHall` — the full architectural environment.
 * This stays as the name arrival already uses (`WelcomeFlow`, `AuthGate`'s
 * session fallback, and the route's own loading segment all mount it) so
 * that turning the environmental shell into a real place changed no
 * arrival logic whatsoever: the same three call sites, the same props,
 * the same behaviour. Only what a member sees changed.
 */
export function ArrivalRoom({ children }: ArrivalRoomProps) {
  return <LivingHall>{children}</LivingHall>;
}
