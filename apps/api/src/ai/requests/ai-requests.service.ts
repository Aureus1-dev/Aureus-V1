import { ForbiddenException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AiCapability, AiRequestStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/ai-roles.util';
import { AI_PROVIDER, AiCompletionMessage, IAiProvider } from '../providers/ai-provider.interface';
import { computeCostUsd } from './ai-pricing.util';
import { AiRequestResponseDto } from './dto/ai-request-response.dto';
import { ListAiRequestsQueryDto } from './dto/list-ai-requests-query.dto';
import { PaginatedAiRequestsResponseDto } from './dto/paginated-ai-requests-response.dto';
import { AI_REQUEST_REPOSITORY, IAiRequestRepository } from './repositories/ai-request.repository.interface';

export interface RunCompletionParams {
  userId: string;
  capability: AiCapability;
  conversationId?: string;
  messages: AiCompletionMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  content: string;
  requestId: string;
}

/**
 * Unifies "AI request history," "cost tracking," and "audit logging" into
 * one code path (ADR-015 Decision 3, mirroring ADR-014 Decision 7's single
 * completion/certification path): every capability service calls
 * runCompletion() instead of the provider directly, so exactly one
 * AiRequest row is written per provider call regardless of which of the
 * seven capabilities triggered it, and no capability can accidentally skip
 * audit logging or cost tracking.
 */
@Injectable()
export class AiRequestsService {
  private readonly logger = new Logger(AiRequestsService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: IAiProvider,
    @Inject(AI_REQUEST_REPOSITORY) private readonly repo: IAiRequestRepository,
  ) {}

  async runCompletion(params: RunCompletionParams): Promise<CompletionResult> {
    const startedAt = Date.now();

    try {
      const output = await this.provider.complete({
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      });
      const latencyMs = Date.now() - startedAt;

      const request = await this.repo.create({
        userId: params.userId,
        conversationId: params.conversationId,
        capability: params.capability,
        provider: output.provider,
        model: output.model,
        promptTokens: output.promptTokens,
        completionTokens: output.completionTokens,
        costUsd: computeCostUsd(output.model, output.promptTokens, output.completionTokens),
        latencyMs,
        status: AiRequestStatus.SUCCESS,
      });

      return { content: output.content, requestId: request.id };
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      await this.repo.create({
        userId: params.userId,
        conversationId: params.conversationId,
        capability: params.capability,
        provider: this.provider.provider,
        model: 'unknown',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        latencyMs,
        status: AiRequestStatus.FAILED,
        errorMessage,
      });

      this.logger.error(`AI completion failed for capability ${params.capability}: ${errorMessage}`);
      throw new ServiceUnavailableException('The AI service is temporarily unavailable. Please try again shortly.');
    }
  }

  async findMine(query: ListAiRequestsQueryDto, caller: AuthenticatedUser): Promise<PaginatedAiRequestsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.repo.findAll({ page, limit, userId: caller.id, capability: query.capability });

    return {
      data: result.data.map(AiRequestResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<AiRequestResponseDto> {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundException(`AI request '${id}' not found`);

    if (request.userId !== caller.id && !hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('You may only access your own AI request history');
    }

    return AiRequestResponseDto.fromEntity(request);
  }
}
