import { ApiError, NetworkError } from '../../../lib/api/errors';
import type { DomainErrorKind } from '../domain-error-copy';

export interface ArrivalError {
  kind: DomainErrorKind;
  message: string;
  retryable: boolean;
}

/**
 * Same classification the Journey/Opportunities/Recommendations state
 * modules use (see JourneyContext's `classifyError`), reused here for
 * arrival steps that call the API directly rather than through a full
 * domain Context (B3's consent grant, B8's failure handling).
 */
export function classifyArrivalError(error: unknown): ArrivalError {
  if (error instanceof ApiError) {
    if (error.isAuthenticationRequired) return { kind: 'authentication', message: error.message, retryable: false };
    if (error.isRateLimited) return { kind: 'rate-limited', message: error.message, retryable: true };
    if (error.isServiceUnavailable) return { kind: 'unavailable', message: error.message, retryable: true };
    if (error.isValidationError) return { kind: 'validation', message: error.message, retryable: false };
    return { kind: 'unknown', message: error.message, retryable: error.retryable };
  }
  if (error instanceof NetworkError) return { kind: 'network', message: error.message, retryable: true };
  return { kind: 'unknown', message: 'Something unexpected happened.', retryable: true };
}
