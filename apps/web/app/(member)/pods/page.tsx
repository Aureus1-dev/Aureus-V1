import { redirect } from 'next/navigation';
import { PodsPage as PodsSurface } from '../../../design-system/components/pods';
import { V1_FEATURE_FLAGS } from '../../../lib/config/v1-feature-scope';

/**
 * C2 — V1 Scope Lockdown: Pods is cut for V1 (LAUNCH-001: "No Pods, no
 * Academy"). Closing the direct route, not just the nav link, since a
 * stale bookmark or link is still a reachable path to the member-facing
 * surface.
 */
export default function PodsPage() {
  if (!V1_FEATURE_FLAGS.pods) {
    redirect('/home');
  }
  return <PodsSurface />;
}
