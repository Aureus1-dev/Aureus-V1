import { Logger } from '@nestjs/common';
import { classifyFetchError, classifyHttpStatus, isRetryableCategory, ProviderError } from './provider-error.util';

export interface ResilientFetchOptions {
  /** Aborts a single attempt after this many milliseconds (AbortController-based). */
  timeoutMs: number;
  /** Total attempts, including the first — 1 means "no retry." */
  maxAttempts: number;
  /** Base delay for exponential backoff (attempt 1 waits ~baseDelayMs, attempt 2 ~2x, etc.), plus jitter. */
  baseDelayMs: number;
  logger: Logger;
  /** Included in log lines so a timeout/retry is traceable to the provider that hit it. */
  providerName: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * PD-009 (AI Provider Resilience). Wraps the platform `fetch` with a
 * configurable timeout (`AbortController`, since neither provider's REST
 * call had one before this) and a bounded retry-with-exponential-backoff
 * policy — but only for the error categories `isRetryableCategory` marks
 * safe: a timeout, a network failure, a 429, or a 5xx. A 4xx (bad request,
 * invalid API key, etc.) is never retried, since the same malformed
 * request would fail identically every time — retrying it would only
 * waste time and, for a malformed-input case, obscure the real problem
 * behind a misleading multi-attempt log trail.
 *
 * Both `OpenAiProvider` and `AnthropicProvider` call this instead of
 * `fetch` directly, so the retry/timeout policy is defined once and cannot
 * drift between the two providers.
 */
export async function resilientFetch(
  url: string,
  init: RequestInit,
  options: ResilientFetchOptions,
): Promise<Response> {
  let lastError: ProviderError | undefined;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) return res;

      const category = classifyHttpStatus(res.status);
      const body = await res.text();
      lastError = new ProviderError(`${options.providerName} request failed (${res.status}): ${body}`, category, res.status);

      if (!isRetryableCategory(category) || attempt === options.maxAttempts) throw lastError;
      options.logger.warn(`${options.providerName} attempt ${attempt}/${options.maxAttempts} failed (${category}, status ${res.status}) — retrying.`);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ProviderError) {
        if (!isRetryableCategory(err.category) || attempt === options.maxAttempts) throw err;
        lastError = err;
      } else {
        const category = classifyFetchError(err);
        const message = err instanceof Error ? err.message : 'Unknown fetch error';
        lastError = new ProviderError(`${options.providerName} request threw (${category}): ${message}`, category);
        if (!isRetryableCategory(category) || attempt === options.maxAttempts) throw lastError;
        options.logger.warn(`${options.providerName} attempt ${attempt}/${options.maxAttempts} failed (${category}) — retrying.`);
      }
    }

    // Exponential backoff with jitter (0-100ms) — only reached when another attempt remains.
    const backoffMs = options.baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
    await sleep(backoffMs);
  }

  // Unreachable in practice (the loop always throws on its final attempt above), but keeps the return type honest.
  throw lastError ?? new ProviderError(`${options.providerName} request failed with no captured error.`, 'unknown');
}
