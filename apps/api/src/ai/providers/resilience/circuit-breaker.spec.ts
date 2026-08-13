import { CircuitBreaker } from './circuit-breaker';
import { ProviderError } from './provider-error.util';

describe('CircuitBreaker', () => {
  it('starts closed and stays closed while calls succeed', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1_000 });
    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.getState()).toBe('closed');
  });

  it('opens once consecutive failures reach the threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1_000 });
    const failing = () => Promise.reject(new Error('boom'));

    await expect(breaker.execute(failing)).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('closed');
    await expect(breaker.execute(failing)).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('closed');
    await expect(breaker.execute(failing)).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('open');
  });

  it('rejects immediately with a circuit_open ProviderError while open, never calling the wrapped function', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1_000 });
    await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('open');

    const fn = jest.fn().mockResolvedValue('should not run');
    await expect(breaker.execute(fn)).rejects.toThrow(ProviderError);
    await expect(breaker.execute(fn)).rejects.toMatchObject({ category: 'circuit_open' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('transitions to half_open after the cooldown elapses, then closes on a successful call', async () => {
    jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 5_000 });
    await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('open');

    jest.advanceTimersByTime(5_001);
    expect(breaker.getState()).toBe('half_open');

    await breaker.execute(() => Promise.resolve('recovered'));
    expect(breaker.getState()).toBe('closed');
    jest.useRealTimers();
  });

  it('reopens immediately on a failure while half_open (a single retry does not get another chance)', async () => {
    jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 5_000 });
    await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    jest.advanceTimersByTime(5_001);
    expect(breaker.getState()).toBe('half_open');

    await expect(breaker.execute(() => Promise.reject(new Error('still down')))).rejects.toThrow('still down');
    expect(breaker.getState()).toBe('open');
    jest.useRealTimers();
  });
});
