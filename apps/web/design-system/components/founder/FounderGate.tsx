'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../state';

const FOUNDER_ROLES = ['PLATFORM_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'];

export interface FounderGateProps {
  children: ReactNode;
}

/**
 * Restricts the Founder Operating System (PR-003) to Platform/System
 * Administrators. Mounted inside the member route group's `AuthGate`, so
 * authentication is already guaranteed by the time this renders — it only
 * adds the role check on top, redirecting anyone else back to `/home`.
 */
export function FounderGate({ children }: FounderGateProps) {
  const router = useRouter();
  const { session } = useSession();
  const isFounder = session.roles.some((role) => FOUNDER_ROLES.includes(role));

  useEffect(() => {
    if (!isFounder) {
      router.replace('/home');
    }
  }, [isFounder, router]);

  if (!isFounder) {
    return null;
  }

  return <>{children}</>;
}
