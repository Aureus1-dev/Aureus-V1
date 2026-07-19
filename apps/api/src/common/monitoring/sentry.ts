import * as Sentry from '@sentry/node';

/**
 * Error tracking (Production Stability). A no-op whenever SENTRY_DSN is
 * unset — the same "safe, non-blocking default" shape as EmailModule/
 * AiProviderModule: every environment without a DSN (local dev, CI, this
 * sandbox) runs identically to before Sentry existed. Sentry.captureException
 * is itself safe to call uninitialized (it no-ops), so call sites never need
 * to branch on whether this ran.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0,
  });
}
