import { Logger } from '@nestjs/common';
import { resilientFetch } from './resilient-fetch.util';
import { ProviderError } from './provider-error.util';

function makeOkResponse(): Response {
  return { ok: true, status: 200 } as unknown as Response;
}

function makeErrorResponse(status: number, body = 'error body'): Response {
  return { ok: false, status, text: async () => body } as unknown as Response;
}

function silentLogger(): Logger {
  return { warn: jest.fn(), log: jest.fn(), error: jest.fn() } as unknown as Logger;
}

describe('resilientFetch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns the response on the first attempt when it succeeds', async () => {
    const fetchMock = jest.fn().mockResolvedValue(makeOkResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await resilientFetch(
      'https://example.com',
      {},
      { timeoutMs: 1_000, maxAttempts: 3, baseDelayMs: 1, logger: silentLogger(), providerName: 'Test' },
    );

    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 500 up to maxAttempts, then succeeds', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(makeErrorResponse(500))
      .mockResolvedValueOnce(makeOkResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await resilientFetch(
      'https://example.com',
      {},
      { timeoutMs: 1_000, maxAttempts: 3, baseDelayMs: 1, logger: silentLogger(), providerName: 'Test' },
    );

    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries a 4xx (client_error) — fails on the first attempt', async () => {
    const fetchMock = jest.fn().mockResolvedValue(makeErrorResponse(400, 'bad request'));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      resilientFetch(
        'https://example.com',
        {},
        { timeoutMs: 1_000, maxAttempts: 3, baseDelayMs: 1, logger: silentLogger(), providerName: 'Test' },
      ),
    ).rejects.toMatchObject({ category: 'client_error' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exhausts maxAttempts on a persistent 503 and throws a ProviderError', async () => {
    const fetchMock = jest.fn().mockResolvedValue(makeErrorResponse(503, 'unavailable'));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      resilientFetch(
        'https://example.com',
        {},
        { timeoutMs: 1_000, maxAttempts: 3, baseDelayMs: 1, logger: silentLogger(), providerName: 'Test' },
      ),
    ).rejects.toBeInstanceOf(ProviderError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries a thrown network error (TypeError) and eventually succeeds', async () => {
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(makeOkResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await resilientFetch(
      'https://example.com',
      {},
      { timeoutMs: 1_000, maxAttempts: 3, baseDelayMs: 1, logger: silentLogger(), providerName: 'Test' },
    );

    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('times out a hanging request via AbortController and retries', async () => {
    let firstAttempt = true;
    const fetchMock = jest.fn().mockImplementation((_url: string, init: RequestInit) => {
      if (firstAttempt) {
        firstAttempt = false;
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }
      return Promise.resolve(makeOkResponse());
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await resilientFetch(
      'https://example.com',
      {},
      { timeoutMs: 20, maxAttempts: 3, baseDelayMs: 1, logger: silentLogger(), providerName: 'Test' },
    );

    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
