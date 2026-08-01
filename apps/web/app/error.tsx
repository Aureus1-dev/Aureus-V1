'use client';

import { useEffect } from 'react';
import { ErrorState } from '../design-system/components/ErrorState/ErrorState';
import { Button } from '../design-system/components/Button/Button';
import styles from './error.module.css';

/**
 * Catches a render-time throw anywhere below the root layout — which,
 * before this file existed, meant any such throw on any of the 36 routes
 * showed Next's generic "Application error" screen with no way forward.
 *
 * Unlike `global-error.tsx`, the layout is still intact here, so this
 * uses the real design system: a member sees a failure that still looks
 * like Aureus, in the room they were already in, rather than being
 * ejected into an unstyled browser page.
 *
 * `reset()` re-renders the failed segment rather than reloading, so a
 * transient failure costs the member nothing.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Aureus route error:', error, error.digest);
  }, [error]);

  return (
    <div className={styles.wrapper}>
      <ErrorState
        title="Something went wrong on our side"
        description="This is our fault, not yours, and nothing you have shared has been lost. You can try again from here."
        action={
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
