import { apiRequest, configureAuthBridge } from './http';
import { ApiError, NetworkError } from './errors';

describe('apiRequest', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    configureAuthBridge(null);
    jest.resetAllMocks();
  });

  it('sends the bearer token and parses a successful JSON response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: '1' }),
    }) as unknown as typeof fetch;

    const result = await apiRequest<{ id: string }>('/ai/conversations', { accessToken: 'token-123' });

    expect(result).toEqual({ id: '1' });
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer token-123');
  });

  it('throws ApiError with the parsed message on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ message: 'The AI service is temporarily unavailable' }),
    }) as unknown as typeof fetch;

    await expect(apiRequest('/ai/conversations/1/messages')).rejects.toMatchObject({
      status: 503,
      message: 'The AI service is temporarily unavailable',
    });
  });

  it('marks 503 and 429 as retryable, 401 and 400 as not', () => {
    expect(new ApiError(503, 'x').retryable).toBe(true);
    expect(new ApiError(429, 'x').retryable).toBe(true);
    expect(new ApiError(401, 'x').retryable).toBe(false);
    expect(new ApiError(400, 'x').retryable).toBe(false);
  });

  it('throws NetworkError when fetch itself rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    await expect(apiRequest('/ai/conversations')).rejects.toBeInstanceOf(NetworkError);
  });

  it('refreshes and retries once on a 401 when a bridge is configured', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized', json: async () => ({ message: 'Unauthorized' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: '1' }) }) as unknown as typeof fetch;

    const refreshAndRetry = jest.fn().mockResolvedValue('fresh-access-token');
    configureAuthBridge({ refreshAndRetry });

    const result = await apiRequest<{ id: string }>('/ai/conversations', { accessToken: 'stale-token' });

    expect(result).toEqual({ id: '1' });
    expect(refreshAndRetry).toHaveBeenCalledTimes(1);
    const [, secondInit] = (global.fetch as jest.Mock).mock.calls[1];
    expect(secondInit.headers.Authorization).toBe('Bearer fresh-access-token');
  });

  it('surfaces the original 401 when the refresh bridge cannot obtain a new token', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Unauthorized' }),
    }) as unknown as typeof fetch;

    const refreshAndRetry = jest.fn().mockResolvedValue(null);
    configureAuthBridge({ refreshAndRetry });

    await expect(apiRequest('/ai/conversations')).rejects.toMatchObject({ status: 401 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh when retryOn401 is false', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Invalid email or password' }),
    }) as unknown as typeof fetch;

    const refreshAndRetry = jest.fn();
    configureAuthBridge({ refreshAndRetry });

    await expect(apiRequest('/auth/login', { retryOn401: false })).rejects.toMatchObject({ status: 401 });
    expect(refreshAndRetry).not.toHaveBeenCalled();
  });
});
