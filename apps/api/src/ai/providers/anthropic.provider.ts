import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import { AiCompletionInput, AiCompletionOutput, IAiProvider } from './ai-provider.interface';

interface AnthropicMessagesResponse {
  model: string;
  content: { type: string; text?: string }[];
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Anthropic Messages API provider. Calls the real REST API via the
 * platform-standard runtime `fetch` — see OpenAiProvider for the
 * no-vendor-SDK rationale. Anthropic's Messages API takes the system
 * prompt as a top-level field, not a message with role "system", so
 * system messages are extracted from the conversation and joined
 * separately. Only ever instantiated by the AI_PROVIDER factory when
 * ANTHROPIC_API_KEY is actually configured (ai.module.ts).
 */
@Injectable()
export class AnthropicProvider implements IAiProvider {
  readonly provider = AiProvider.ANTHROPIC;
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private readonly config: ConfigService) {}

  async complete(input: AiCompletionInput): Promise<AiCompletionOutput> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    const model = this.config.get<string>('ANTHROPIC_MODEL', 'claude-3-5-haiku-20241022');

    const systemPrompt = input.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const conversation = input.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt || undefined,
        messages: conversation,
        max_tokens: input.maxTokens ?? 500,
        temperature: input.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Anthropic request failed (${res.status}): ${body}`);
      throw new Error(`Anthropic request failed with status ${res.status}`);
    }

    const data = (await res.json()) as AnthropicMessagesResponse;
    const content = data.content.filter((block) => block.type === 'text').map((block) => block.text ?? '').join('');

    return {
      content,
      provider: this.provider,
      model: data.model ?? model,
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
    };
  }
}
