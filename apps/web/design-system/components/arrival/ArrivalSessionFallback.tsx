'use client';

import { usePathname } from 'next/navigation';
import { SessionRestoringNotice } from '../auth/AuthGate';
import { LoadingState } from '../LoadingState/LoadingState';
import { ArrivalRoom } from './ArrivalRoom';
import { ArrivalStage } from './ArrivalStage';

/** Arrival is the one experience whose waiting belongs in the Hall rather than on a plain screen. */
const ARRIVAL_PATHS = ['/welcome'];

/**
 * `AuthGate` runs above every member surface, so on a cold load its
 * session-restore frame is the genuine first thing a member sees —
 * before the route below it has rendered anything at all. Left as the
 * default plain notice, arrival would begin on a bare screen and only
 * become the Hall a moment later, which is precisely the seam of
 * "switching between onboarding screens and the room."
 *
 * On the arrival route, the wait therefore happens in the Hall itself.
 * The room mounted here and the room `WelcomeFlow` mounts a moment later
 * are necessarily two different React trees — one above the gate, one
 * below it — so the handoff does involve a remount. That is invisible
 * only because `ArrivalRoom` renders identically on every mount and has
 * no entrance of its own to replay; the second room is pixel-identical
 * to the first, and all the member sees change is what stands on the
 * stage inside it.
 *
 * Every other surface keeps the plain notice, unchanged.
 */
export function ArrivalSessionFallback() {
  const pathname = usePathname();
  const isArrival = ARRIVAL_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(`${path}/`),
  );

  if (!isArrival) return <SessionRestoringNotice />;

  return (
    <ArrivalRoom>
      <ArrivalStage stepKey="session">
        <LoadingState label="Preparing your session" />
      </ArrivalStage>
    </ArrivalRoom>
  );
}
