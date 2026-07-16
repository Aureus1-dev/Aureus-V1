import { API_BASE_URL } from './config';
import { ApiError, NetworkError } from './errors';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
  /**
   * Whether a 401 should trigger one silent token refresh + retry before
   * surfacing the error. Defaults to true so every existing domain client
   * (e.g. `lib/api/conversations.ts`) gets this behavior automatically,
   * without any change to that module. The auth endpoints themselves
   * (`lib/api/auth.ts`) pass `false` to avoid refreshing in response to
   * their own failures.
   */
  retryOn401?: boolean;
}

interface AuthBridge {
  refreshAndRetry: () => Promise<string | null>;
}

let authBridge: AuthBridge | null = null;

/**
 * Registered once by the Session module on startup (FPB-009 — the
 * frontend consumes capabilities; this is transport plumbing, not
 * authentication business logic). No other module calls this.
 */
export function configureAuthBridge(bridge: AuthBridge | null): void {
  authBridge = bridge;
}

/**
 * Authenticated fetch wrapper for the documented backend contract
 * (FPB-009 §1: "The frontend shall consume capabilities. The backend
 * shall provide capabilities."). No business logic — only transport,
 * typed error translation, and (when enabled) a single transparent
 * refresh-and-retry on an expired access token.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await performRequest(path, options);

  if (response.status === 401 && options.retryOn401 !== false && authBridge) {
    const newAccessToken = await authBridge.refreshAndRetry();
    if (newAccessToken) {
      const retried = await performRequest(path, { ...options, accessToken: newAccessToken });
      return parseResponse<T>(retried);
    }
  }

  return parseResponse<T>(response);
}

async function performRequest(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new NetworkError();
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(' ');
    }
    return body.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
