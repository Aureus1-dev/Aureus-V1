'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { RoomTransition } from '../../layout/RoomTransition';
import styles from './HallStage.module.css';

export interface HallStageProps {
  children: ReactNode;
}

/**
 * The stage: where whatever the member is currently doing actually sits,
 * inside the Hall.
 *
 * This is the application's `<main>`. It used to be a cell in the shell's
 * grid, with the Hall rendered *into* it on two routes — the environment
 * nested inside a region of the interface, which is the inversion this
 * work exists to correct. Now it is a child of the room, and the room is
 * the root.
 *
 * ── The Hearth invariant ───────────────────────────────────────────
 *
 * Founder ruling: "The Hearth shall never become fully obscured.
 * Loading states. Navigation. Dialogs. Toasts. Panels. Errors.
 * Transitions. All shall preserve visual continuity with the Hearth."
 *
 * That invariant is held here structurally rather than by convention.
 * The stage is a *sibling* of the hearth, never an overlay on it, and it
 * scrolls its own overflow rather than growing: however much content a
 * place has, the stage can only ever fill the space beneath the hearth,
 * and the hearth stays lit above it. There is no arrangement of content,
 * and no route, that can cover it — which is the only way an invariant
 * of this kind survives contact with twenty other surfaces.
 *
 * `overscroll-behavior: contain` keeps a scroll that reaches the end of
 * the stage from continuing into the document and dragging the room.
 *
 * `RoomTransition` moved here with `<main>`. It used to live in the
 * shell, keyed on the route, and it is the only part of that shell whose
 * job was always the environment's: the atmosphere changing while the
 * room stays. It keeps its existing behaviour unchanged here and is
 * where the passage between places will be built.
 */
export function HallStage({ children }: HallStageProps) {
  const pathname = usePathname();

  return (
    <main id="main-content" className={styles.stage} tabIndex={-1}>
      <RoomTransition pathname={pathname}>{children}</RoomTransition>
    </main>
  );
}
