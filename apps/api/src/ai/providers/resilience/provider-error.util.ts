/**
 * PD-009 (AI Provider Resilience). A structured classification of why a
 * provider call failed — shared by the retry policy (`resilient-fetch.util`,
 * which needs to know what is safe to retry) and by `AiRequestsService`'s
 * audit log (which benefits from a real category rather than a raw message
 * string it would otherwise have to re-parse).
 *
 * - `timeout` / `network_error` / `rate_limited` / `server_error` — transient,
 *   safe to retry (per `isRetryableCategory`).
 * - `client_error` — the request itself was malformed or unauthorized;
 *   retrying it would fail identically every time, so it never is.
 * - `circuit_open` — the breaker itself refused the call; never retried
 *   within the same attempt loop (retrying would defeat the breaker's
 *   purpose of giving a failing provider room to recover).
 * - `unknown` — anything this classifier doesn't recognize; treated as
 *   non-retryable so an unrecognized failure mode never silently loops.
 */
export type ProviderErrorCategory =
  | 'timeout'
  | 'network_error'
  | 'rate_limited'
  | 'server_error'
  | 'client_error'
  | 'circuit_open'
  | 'unknown';

/** Thrown by `resilientFetch`/`OpenAiProvider`/`AnthropicProvider` so callers never have to re-derive the category from a message string. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly category: ProviderErrorCategory,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function isRetryableCategory(category: ProviderErrorCategory): boolean {
  return category === 'timeout' || category === 'network_error' || category === 'rate_limited' || category === 'server_error';
}

/** Classifies a non-OK HTTP response from either provider's REST API. */
export function classifyHttpStatus(status: number): ProviderErrorCategory {
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_error';
  if (status >= 400) return 'client_error';
  return 'unknown';
}

/** Classifies a thrown error from the `fetch` call itself (never reached the provider, or was aborted). */
export function classifyFetchError(err: unknown): ProviderErrorCategory {
  if (err instanceof Error && err.name === 'AbortError') return 'timeout';
  if (err instanceof TypeError) return 'network_error'; // fetch's own failure mode for DNS/connection errors
  return 'unknown';
}
