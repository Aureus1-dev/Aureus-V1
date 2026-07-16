/**
 * Typed API failure (FPB-014 §5). Callers branch on `status`/`retryable`
 * rather than parsing message text, so recovery language stays owned by
 * the presentation layer (FPB-014 §8) instead of the transport layer.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryable = status === 503 || status === 429 || status >= 500;
  }

  get isAuthenticationRequired(): boolean {
    return this.status === 401;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServiceUnavailable(): boolean {
    return this.status === 503;
  }

  get isValidationError(): boolean {
    return this.status === 400;
  }
}

export class NetworkError extends Error {
  readonly retryable = true;

  constructor() {
    super('The network request could not be completed.');
    this.name = 'NetworkError';
  }
}
