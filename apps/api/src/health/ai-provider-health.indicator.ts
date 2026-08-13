import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { OpenAiProvider } from '../ai/providers/openai.provider';
import { AnthropicProvider } from '../ai/providers/anthropic.provider';

/**
 * PD-009 (AI Provider Resilience) — "Health monitoring." Reports each
 * *configured* provider's circuit-breaker state (`closed`/`half_open`/
 * `open`) rather than issuing a synthetic ping on every health check,
 * which would cost real money and latency on a poll that may run every
 * few seconds. The breaker already tracks real traffic, so this indicator
 * is a free read of state that already exists, not a new outbound call.
 *
 * Deliberately not part of `/health/ready` (`HealthController.ready()`):
 * most member-facing routes don't depend on AI, so an AI outage
 * (transient by nature — that's exactly what PD-009 exists to survive)
 * must never take the whole app out of a load balancer's rotation. It is
 * exposed on its own diagnostic route, `/health/ai`, instead.
 */
@Injectable()
export class AiProviderHealthIndicator extends HealthIndicator {
  constructor(
    private readonly config: ConfigService,
    private readonly openAi: OpenAiProvider,
    private readonly anthropic: AnthropicProvider,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const selected = this.config.get<string>('AI_PROVIDER', 'stub');
    const details: Record<string, string> = { configuredProvider: selected };

    let anyOpen = false;
    if (this.config.get<string>('OPENAI_API_KEY')) {
      const state = this.openAi.getCircuitState();
      details.openai = state;
      if (state === 'open') anyOpen = true;
    }
    if (this.config.get<string>('ANTHROPIC_API_KEY')) {
      const state = this.anthropic.getCircuitState();
      details.anthropic = state;
      if (state === 'open') anyOpen = true;
    }

    if (anyOpen) {
      const result = this.getStatus(key, false, details);
      throw new HealthCheckError('An AI provider circuit breaker is open', result);
    }
    return this.getStatus(key, true, details);
  }
}
