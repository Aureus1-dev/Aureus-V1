import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import { AiCompletionInput, AiCompletionOutput, IAiProvider } from './ai-provider.interface';

interface OpenAiChatResponse {
  model: string;
  choices: { message: { content: string } }[];
  usage: { prompt_tokens: number; completion_tokens: number };
}

/**
 * OpenAI Chat Completions provider. Calls the real REST API via the
 * platform-standard runtime `fetch` — no vendor SDK dependency, matching
 * NodemailerEmailService's provider-agnostic-transport precedent (ADR-009
 * §7). Only ever instantiated by the AI_PROVIDER factory when OPENAI_API_KEY
 * is actually configured (ai.module.ts) — this class assumes a key exists.
 */
@Injectable()
export class OpenAiProvider implements IAiProvider {
  readonly provider = AiProvider.OPENAI;
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private readonly config: ConfigService) {}

  async complete(input: AiCompletionInput): Promise<AiCompletionOutput> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    const model = this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: input.maxTokens ?? 500,
        temperature: input.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`OpenAI request failed (${res.status}): ${body}`);
      throw new Error(`OpenAI request failed with status ${res.status}`);
    }

    const data = (await res.json()) as OpenAiChatResponse;
    return {
      content: data.choices[0]?.message?.content ?? '',
      provider: this.provider,
      model: data.model ?? model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}
