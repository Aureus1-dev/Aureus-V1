import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiCompletionMessage } from '../providers/ai-provider.interface';
import {
  imagePartsFromAiContent,
  textFromAiContent,
} from '../providers/ai-message-content.util';
import { checkContentFallback, ModerationCategory } from './moderation-fallback.util';

export interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategory[];
}

interface OpenAiModerationResponse {
  results: { flagged: boolean; categories: Record<string, boolean> }[];
}

/**
 * PD-007 (AI Safety: Content Moderation & Prompt-Injection Defense), item
 * 1. Checked once per `AiRequestsService.runCompletion()` call (the single
 * choke point every capability already shares), so every capability —
 * Conversations, Insights, Recommendations, the Orchestrator, Pod
 * Insights — gets this automatically with no per-capability wiring.
 *
 * Prefers the real OpenAI moderation endpoint whenever OpenAI is the
 * configured completion provider (`AI_PROVIDER=openai`, matching
 * `AiProviderModule`'s own selection logic exactly), falling back to the
 * deterministic phrase-list check (`moderation-fallback.util.ts`)
 * otherwise — including for Anthropic and the local/CI stub provider.
 * Deliberately does not call OpenAI's endpoint whenever a *different*
 * provider is selected, even if an OpenAI key happens to be present: this
 * sandbox's own `.env` is a concrete example of why — a real
 * `OPENAI_API_KEY` can exist while network egress to `api.openai.com` is
 * blocked, which is exactly the condition `AI_PROVIDER=stub` is already
 * used elsewhere in this codebase to route around for completions; gating
 * moderation the same way avoids introducing a new, surprising path back
 * to that same blocked endpoint.
 *
 * Known limitation, stated plainly rather than silently: `VoiceSessionService`
 * does not call `AiRequestsService.runCompletion()` at all — it writes
 * directly to the AI request repository via its own realtime provider path.
 * This moderation layer therefore does not yet cover Voice traffic; closing
 * that gap is a separate, larger integration effort against Voice's
 * realtime broker, tracked as follow-up work rather than expanded into
 * silently here.
 */
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly config: ConfigService) {}

  async checkMessages(messages: AiCompletionMessage[]): Promise<ModerationResult> {
    const userMessages = messages.filter((m) => m.role === 'user');
    if (userMessages.length === 0) return { flagged: false, categories: [] };

    const selectedProvider = this.config.get<string>('AI_PROVIDER', 'stub');
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (selectedProvider === 'openai' && apiKey) {
      return this.checkViaOpenAi(userMessages, apiKey);
    }

    return this.fallbackAfterProviderFailure(
      userMessages.map((message) => textFromAiContent(message.content)),
    );
  }

  private async checkViaOpenAi(
    messages: AiCompletionMessage[],
    apiKey: string,
  ): Promise<ModerationResult> {
    const fallbackTexts = messages.map((message) => textFromAiContent(message.content));
    const input = messages.flatMap((message) => {
      const text = textFromAiContent(message.content);
      const images = imagePartsFromAiContent(message.content);
      return [
        ...(text.trim() ? [{ type: 'text', text }] : []),
        ...images.map((image) => ({
          type: 'image_url',
          image_url: { url: `data:${image.mediaType};base64,${image.data}` },
        })),
      ];
    });
    try {
      const res = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ input }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`OpenAI moderation request failed (${res.status}): ${body}`);
        return this.fallbackAfterProviderFailure(fallbackTexts);
      }

      const data = (await res.json()) as OpenAiModerationResponse;
      const categories = new Set<string>();
      let flagged = false;
      for (const result of data.results) {
        if (result.flagged) {
          flagged = true;
          for (const [category, isFlagged] of Object.entries(result.categories)) {
            if (isFlagged) categories.add(category);
          }
        }
      }
      return { flagged, categories: [...categories] as ModerationCategory[] };
    } catch (err) {
      this.logger.error(`OpenAI moderation request threw: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return this.fallbackAfterProviderFailure(fallbackTexts);
    }
  }

  /**
   * A moderation-provider outage must never silently mean "unchecked" —
   * falls back to the deterministic check rather than treating a failed
   * moderation call as an automatic pass.
   */
  private fallbackAfterProviderFailure(contents: string[]): ModerationResult {
    const categories = new Set<ModerationCategory>();
    for (const content of contents) {
      for (const category of checkContentFallback(content)) categories.add(category);
    }
    return { flagged: categories.size > 0, categories: [...categories] };
  }
}
