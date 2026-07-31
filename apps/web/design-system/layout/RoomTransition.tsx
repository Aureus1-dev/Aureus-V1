'use client';

import type { ReactNode } from 'react';
import styles from './RoomTransition.module.css';

export interface RoomTransitionProps {
  /** The current route — remounting the region on change is what triggers the entrance animation below. */
  pathname: string | null;
  children: ReactNode;
}

/**
 * A soft atmosphere change between Rooms, not a hard page swap (Living
 * Steward Workspace redesign). `AppShell` already keeps its own chrome
 * (nav, floating widgets) mounted across every route change — this only
 * animates the `{children}` region that actually swaps, via a `key`ed
 * remount that plays a brief entrance animation (`RoomTransition.module.css`)
 * built entirely from the existing motion tokens. No new dependency, no
 * separate reduced-motion branch needed here: `[data-reduced-motion='true']`
 * and `prefers-reduced-motion` already zero out `--motion-duration-*` at
 * the token layer (`build-theme-css.ts`), which collapses the animation to
 * 0ms — instant — for free.
 */
export function RoomTransition({ pathname, children }: RoomTransitionProps) {
  return (
    <div key={pathname ?? 'root'} className={styles.region}>
      {children}
    </div>
  );
}
