import { classifyFetchError, classifyHttpStatus, isRetryableCategory, ProviderError } from './provider-error.util';

describe('provider-error.util', () => {
  describe('classifyHttpStatus', () => {
    it('classifies 429 as rate_limited', () => {
      expect(classifyHttpStatus(429)).toBe('rate_limited');
    });

    it('classifies 5xx as server_error', () => {
      expect(classifyHttpStatus(500)).toBe('server_error');
      expect(classifyHttpStatus(503)).toBe('server_error');
    });

    it('classifies other 4xx as client_error', () => {
      expect(classifyHttpStatus(400)).toBe('client_error');
      expect(classifyHttpStatus(401)).toBe('client_error');
      expect(classifyHttpStatus(404)).toBe('client_error');
    });

    it('classifies a 2xx/3xx status as unknown (never reached for an ok response in practice)', () => {
      expect(classifyHttpStatus(200)).toBe('unknown');
    });
  });

  describe('classifyFetchError', () => {
    it('classifies an AbortError as timeout', () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      expect(classifyFetchError(err)).toBe('timeout');
    });

    it('classifies a TypeError (fetch network failure) as network_error', () => {
      expect(classifyFetchError(new TypeError('fetch failed'))).toBe('network_error');
    });

    it('classifies anything else as unknown', () => {
      expect(classifyFetchError(new Error('something else'))).toBe('unknown');
      expect(classifyFetchError('not an error')).toBe('unknown');
    });
  });

  describe('isRetryableCategory', () => {
    it('marks timeout, network_error, rate_limited, and server_error as retryable', () => {
      expect(isRetryableCategory('timeout')).toBe(true);
      expect(isRetryableCategory('network_error')).toBe(true);
      expect(isRetryableCategory('rate_limited')).toBe(true);
      expect(isRetryableCategory('server_error')).toBe(true);
    });

    it('marks client_error and circuit_open as never retryable', () => {
      expect(isRetryableCategory('client_error')).toBe(false);
      expect(isRetryableCategory('circuit_open')).toBe(false);
    });
  });

  describe('ProviderError', () => {
    it('carries its category and optional status', () => {
      const err = new ProviderError('boom', 'server_error', 503);
      expect(err.category).toBe('server_error');
      expect(err.status).toBe(503);
      expect(err.name).toBe('ProviderError');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
