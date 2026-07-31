'use client';

import { useEffect } from 'react';

/**
 * The last line of defence. Next renders this only when the root layout
 * itself fails, which means it replaces `<html>` entirely — no theme
 * provider, no token layer, no `globals.css`. Everything here is
 * therefore inline and self-contained on purpose; a stylesheet that
 * failed to load is one of the things that can land a member here.
 *
 * Without this file, that failure shows Next's built-in "Application
 * error: a client-side exception has occurred" — a message that tells a
 * member nothing, offers them nothing, and reads as though Aureus has
 * broken and abandoned them. A member arriving in crisis deserves better
 * than a stack-trace placeholder, so this keeps the one thing that
 * matters within reach: a way to try again, and the reassurance that
 * their information is intact.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Nothing here yet beyond the browser console — wiring this to a
    // reporter is the remaining half of the job (see the audit's
    // "crash reporting" item). Logging it at least means the digest is
    // recoverable from a member's own console during the pilot.
    console.error('Aureus root error:', error, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#faf7f2',
          color: '#2b241c',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          lineHeight: 1.5,
        }}
      >
        <main style={{ maxWidth: '30rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
            Something went wrong on our side
          </h1>
          <p style={{ margin: '0 0 1.5rem', color: '#5c5245' }}>
            This is our fault, not yours, and nothing you have shared has been lost. You can try
            again from here.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: '44px',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '0.5rem',
              background: '#a8481f',
              color: '#faf7f2',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
