import { ForbiddenException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AiCapability, AiRequestStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/ai-roles.util';
import { AI_PROVIDER, AiCompletionMessage, AiToolCallRequest, AiToolDefinition, IAiProvider } from '../providers/ai-provider.interface';
import { computeCostUsd } from './ai-pricing.util';
import { AiOperationalConfigService } from './ai-operational-config.service';
import { AiRequestResponseDto } from './dto/ai-request-response.dto';
import { AiSpendSummaryResponseDto } from './dto/ai-spend-summary-response.dto';
import { AiCapabilitySpendResponseDto } from './dto/ai-capability-spend-response.dto';
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
  tools?: AiToolDefinition[];
}

export interface CompletionResult {
  content: string;
  requestId: string;
  toolCalls?: AiToolCallRequest[];
}

const SPEND_WINDOW_MS = 24 * 60 * 60 * 1000;

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
    private readonly operationalConfig: AiOperationalConfigService,
  ) {}

  async runCompletion(params: RunCompletionParams): Promise<CompletionResult> {
    await this.enforceSpendCeilings(params.userId);
    const startedAt = Date.now();

    try {
      const output = await this.provider.complete({
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
        tools: params.tools,
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

      return { content: output.content, requestId: request.id, toolCalls: output.toolCalls };
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

  /**
   * AI spend limits, quotas, and emergency budget controls (PR-002, made
   * live-editable in PR-003). Checked before every provider call so an
   * over-budget request is refused up front — no provider call is made and
   * no additional cost is incurred. Reads the DB-backed
   * `AiOperationalConfig` singleton (env-var-seeded on first read, then
   * DB-authoritative — see `AiOperationalConfigService`) rather than
   * `ConfigService` directly, so a Founder-facing toggle takes effect on
   * the very next request, no restart required.
   */
  private async enforceSpendCeilings(userId: string): Promise<void> {
    const opConfig = await this.operationalConfig.getEffective();

    if (opConfig.emergencyStop) {
      throw new ServiceUnavailableException(
        'AI features are temporarily disabled by an emergency budget control. Please try again later.',
      );
    }

    const since = new Date(Date.now() - SPEND_WINDOW_MS);

    const globalSpend = await this.repo.sumCostSince(since);
    if (globalSpend >= opConfig.globalDailyBudgetUsd) {
      this.logger.warn(`Platform-wide AI daily budget reached: $${globalSpend.toFixed(4)} >= $${opConfig.globalDailyBudgetUsd}`);
      throw new ServiceUnavailableException(
        'The platform-wide AI budget for today has been reached. Please try again tomorrow.',
      );
    }

    const userSpend = await this.repo.sumCostSince(since, userId);
    if (userSpend >= opConfig.userDailyBudgetUsd) {
      this.logger.warn(`User AI daily quota reached for ${userId}: $${userSpend.toFixed(4)} >= $${opConfig.userDailyBudgetUsd}`);
      throw new ForbiddenException('You have reached your daily AI usage quota. Please try again tomorrow.');
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

  /** Platform-wide AI request audit log (PR-003 Founder Operating System — no per-caller scope). */
  async findAllAdmin(query: ListAiRequestsQueryDto, caller: AuthenticatedUser): Promise<PaginatedAiRequestsResponseDto> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may view the platform-wide AI request log');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repo.findAll({
      page, limit, userId: query.userId, capability: query.capability, status: query.status,
    });

    return {
      data: result.data.map(AiRequestResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  /** Platform-wide spend summary over the current rolling-24h ceiling window (PR-003 Founder dashboard tile). */
  async getSpendSummary(caller: AuthenticatedUser): Promise<AiSpendSummaryResponseDto> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may view the platform-wide AI spend summary');
    }

    const since = new Date(Date.now() - SPEND_WINDOW_MS);
    const [summary, opConfig] = await Promise.all([
      this.repo.summarySince(since),
      this.operationalConfig.getEffective(),
    ]);

    return AiSpendSummaryResponseDto.fromSummary(summary, opConfig.globalDailyBudgetUsd, opConfig.emergencyStop);
  }

  /** Platform-wide AI spend over the current rolling-24h window, grouped by capability (PR-004 Founder visibility). */
  async getSpendByCapability(caller: AuthenticatedUser): Promise<AiCapabilitySpendResponseDto[]> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may view AI spend by capability');
    }

    const since = new Date(Date.now() - SPEND_WINDOW_MS);
    const summary = await this.repo.groupedByCapabilitySince(since);
    return summary.map(AiCapabilitySpendResponseDto.fromSummary);
  }
}
