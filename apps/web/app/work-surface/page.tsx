import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { WorkSurfacePrototype } from '../../design-system/components/work-surface';
import { WORK_SURFACE_PROTOTYPE_ENABLED } from '../../lib/config/work-surface-prototype';

export const metadata: Metadata = {
  title: 'Aureus — Work Surface prototype',
  description:
    'Isolated Slice 0 prototype of the Aureus Work Surface. Not the production front door.',
  robots: { index: false, follow: false },
};

/**
 * Isolated Slice 0 route (PR #151, `AUREUS-WORK-SURFACE-REVIEW-ADDENDUM.md`
 * §10). Deliberately outside `(member)` — no `AuthGate`, no `AppShell`,
 * no member navigation — mirroring the existing `app/ward/[slug]/page.tsx`
 * isolation pattern. The production front door (`app/page.tsx`, the
 * Living Hall) is untouched by this route's existence.
 */
export default function WorkSurfacePrototypePage() {
  if (!WORK_SURFACE_PROTOTYPE_ENABLED) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <WorkSurfacePrototype />
    </Suspense>
  );
}
