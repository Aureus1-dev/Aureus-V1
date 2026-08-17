import { API_BASE_URL } from './config';
import { ApiError, NetworkError } from './errors';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Maximum time a member-facing request may remain unresolved. */
  timeoutMs?: number;
  /**
   * Whether a 401 should trigger one silent token refresh + retry before
   * surfacing the error. Defaults to true so every existing domain client
   * gets this behavior automatically. Auth endpoints pass false.
   */
  retryOn401?: boolean;
}

interface AuthBridge {
  refreshAndRetry: () => Promise<string | null>;
}

let authBridge: AuthBridge | null = null;

export function configureAuthBridge(bridge: AuthBridge | null): void {
  authBridge = bridge;
}

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

function requestSignal(options: RequestOptions): { signal: AbortSignal | undefined; cleanup: () => void } {
  if (!options.timeoutMs) return { signal: options.signal, cleanup: () => undefined };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abortFromCaller);
    },
  };
}

async function performRequest(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const { signal, cleanup } = requestSignal(options);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    cleanup();
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
