import { ProviderError } from './provider-error.util';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  /** Consecutive failures required to open the circuit. */
  failureThreshold: number;
  /** How long the circuit stays open before allowing one trial call (half-open). */
  cooldownMs: number;
}

/**
 * PD-009 (AI Provider Resilience) — a minimal, in-memory circuit breaker.
 * One instance per concrete provider (`OpenAiProvider`/`AnthropicProvider`
 * each own their own — both are ordinary Nest singletons, so this needs no
 * extra wiring). Purpose: once a provider is genuinely down, stop paying
 * the full timeout+retry cost on every subsequent request — fail fast
 * instead, and let `FallbackAiProvider` move to the secondary provider
 * immediately rather than waiting through a doomed retry loop first.
 *
 * Deliberately simple (three states, consecutive-failure counting) rather
 * than a sliding-window/percentage-based breaker — this repository has no
 * existing circuit-breaker precedent to extend, and PD-009's own acceptance
 * criteria ask for "equivalent protection," not a specific algorithm.
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openedAt = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  getState(): CircuitState {
    if (this.state === 'open' && Date.now() - this.openedAt >= this.options.cooldownMs) {
      this.state = 'half_open';
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === 'open') {
      throw new ProviderError('Circuit breaker is open — provider assumed unavailable until the cooldown elapses.', 'circuit_open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === 'half_open' || this.consecutiveFailures >= this.options.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }
}
