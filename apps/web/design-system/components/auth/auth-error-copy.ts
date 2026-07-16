import { ApiError, NetworkError } from '../../../lib/api/errors';

/**
 * The backend's auth error messages (`apps/api/src/auth/**`) are already
 * written for members — "Invalid email or password", "password must be
 * at least 10 characters", etc. — so this mostly passes them through
 * (FPB-009 §1: the frontend consumes capabilities, it does not rewrite
 * them) and only substitutes calmer language for transport-level
 * failures the backend never phrases for a member (FPB-014 §3).
 */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isRateLimited) {
      return "You're trying a little too quickly. Please wait a moment and try again.";
    }
    return error.message;
  }
  if (error instanceof NetworkError) {
    return 'It looks like your connection was interrupted. Please try again.';
  }
  return 'Something went wrong. Please try again in a moment.';
}
