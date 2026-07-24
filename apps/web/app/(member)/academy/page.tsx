import { redirect } from 'next/navigation';
import { AcademyCenter } from '../../../design-system/components/academy';
import { V1_FEATURE_FLAGS } from '../../../lib/config/v1-feature-scope';

/**
 * C2 — V1 Scope Lockdown: Academy is cut for V1 (LAUNCH-001: "No Pods, no
 * Academy"). Closing the direct route, not just the nav link, since a
 * stale bookmark or link is still a reachable path to the member-facing
 * surface.
 */
export default function AcademyPage() {
  if (!V1_FEATURE_FLAGS.academy) {
    redirect('/home');
  }
  return <AcademyCenter />;
}
