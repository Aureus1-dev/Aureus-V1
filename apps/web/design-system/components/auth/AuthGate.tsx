'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import styles from './AuthGate.module.css';

export interface AuthGateProps {
  children: ReactNode;
}

/**
 * Protects the member surfaces (FPB-002's 20 primary experiences) behind
 * authentication. Waits for the silent session-restoration attempt
 * (`SessionProvider`) to finish before deciding whether to redirect, so
 * an already-authenticated member never sees a flash of the sign-in
 * screen on reload.
 */
export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const { session, isRestoring, sessionExpired } = useSession();

  useEffect(() => {
    if (!isRestoring && !session.isAuthenticated) {
      router.replace(sessionExpired ? '/login?expired=1' : '/login');
    }
  }, [isRestoring, session.isAuthenticated, sessionExpired, router]);

  if (isRestoring) {
    return (
      <div className={styles.wrapper}>
        <LoadingState label="Preparing your session" />
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
