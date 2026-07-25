import { Logger } from '@nestjs/common';
import { AiCompletionInput, AiCompletionOutput, IAiProvider } from './ai-provider.interface';

/**
 * PD-009 (AI Provider Resilience) — "a simple cross-provider fallback:
 * configured provider fails → try the other, if both are configured."
 * Deliberately not a new architecture: this still implements `IAiProvider`
 * like every other concrete provider, so `AiRequestsService` (the single
 * choke point, ADR-015 Decision 3) calls `complete()` exactly as before
 * with zero changes to its own code. The two sub-providers are tried
 * strictly in sequence, never concurrently — this is a fallback, not a
 * race, since a concurrent race would double the cost of every request
 * that happens to succeed on both.
 *
 * `provider` reports the primary's identity (not a third "FALLBACK" enum
 * value, which doesn't exist in the schema) — the primary is what
 * `AI_PROVIDER` actually names as configured; the secondary is backup
 * capacity, not a co-equal configured choice. `complete()`'s own return
 * value still carries the concrete provider that actually answered
 * (already true of every `IAiProvider`), so a fallback-served request is
 * still correctly attributed in the `AiRequest` audit row.
 */
export class FallbackAiProvider implements IAiProvider {
  readonly provider = this.primary.provider;
  private readonly logger = new Logger(FallbackAiProvider.name);

  constructor(
    private readonly primary: IAiProvider,
    private readonly secondary: IAiProvider,
  ) {}

  async complete(input: AiCompletionInput): Promise<AiCompletionOutput> {
    try {
      return await this.primary.complete(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Primary provider (${this.primary.provider}) failed, falling over to secondary (${this.secondary.provider}): ${message}`);
      return this.secondary.complete(input);
    }
  }
}
