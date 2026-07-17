'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useInterfaceState } from '../../../state';
import { primarySurfaces } from '../../navigation/surfaces';

/**
 * The first real consumer of `InterfaceContext` (built in FWO-001, never
 * wired to anything until now). Maps the current pathname to its surface
 * id from the canonical `navigation/surfaces.ts` registry and records it
 * via `setCurrentSurface` on every route change, so "context continuity"
 * (FPB-008 §9 — "the steward remembers where the member was") has a real
 * navigation history to draw on, and so the Steward Workspace panel can
 * show the member's own recent path across domains without losing it on
 * navigation (DOMAIN-007 Founder Decision 2). Renders nothing; mounted
 * once alongside the other app-shell-level orchestration components.
 */
export function SurfaceTracker() {
  const pathname = usePathname();
  const { setCurrentSurface } = useInterfaceState();

  useEffect(() => {
    if (!pathname) return;
    const surface = primarySurfaces.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
    if (surface) setCurrentSurface(surface.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
