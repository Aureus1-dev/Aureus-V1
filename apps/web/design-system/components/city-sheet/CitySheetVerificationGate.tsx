'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../state';

const VERIFIER_ROLES = ['STEWARD', 'PLATFORM_ADMINISTRATOR'];

export interface CitySheetVerificationGateProps {
  children: ReactNode;
}

/**
 * Restricts the City Sheet Verification Workflow (A4 engineering) to
 * Steward / Platform Administrator, mirroring the backend's own
 * `MANAGER_ROLES` guard on `CitySheetController` (city sheet entries have
 * no per-entry owner — "Ownership: stewards + Founder"). Mounted inside
 * the member route group's `AuthGate`, so authentication is already
 * guaranteed by the time this renders — it only adds the role check.
 */
export function CitySheetVerificationGate({ children }: CitySheetVerificationGateProps) {
  const router = useRouter();
  const { session } = useSession();
  const isVerifier = session.roles.some((role) => VERIFIER_ROLES.includes(role));

  useEffect(() => {
    if (!isVerifier) {
      router.replace('/home');
    }
  }, [isVerifier, router]);

  if (!isVerifier) {
    return null;
  }

  return <>{children}</>;
}
