import { ForbiddenException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AiCapability, AiRequestStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { CRISIS_REDIRECT_MESSAGE } from '../../needs/crisis-detection.util';
import { PLATFORM_ADMIN_ROLES } from '../common/ai-roles.util';
import { ModerationService } from '../moderation/moderation.service';
import { wrapUntrustedUserContent } from '../moderation/prompt-injection.util';
import { MEMBER_STEWARD_SYSTEM_PROMPT } from '../prompts/member-steward-system-prompt';
import { AI_PROVIDER, AiCompletionMessage, AiToolCallRequest, AiToolDefinition, IAiProvider } from '../providers/ai-provider.interface';
import { computeCostUsd } from './ai-pricing.util';
import { AiOperationalConfigService } from './ai-operational-config.service';
import { AiRequestResponseDto } from './dto/ai-request-response.dto';
import { AiSpendSummaryResponseDto } from './dto/ai-spend-summary-response.dto';
import { AiCapabilitySpendResponseDto } from './dto/ai-capability-spend-response.dto';
import { ListAiRequestsQueryDto } from './dto/list-ai-requests-query.dto';
import { PaginatedAiRequestsResponseDto } from './dto/paginated-ai-requests-response.dto';
import { AI_REQUEST_REPOSITORY, IAiRequestRepository } from './repositories/ai-request.repository.interface';

const MODERATION_REFUSAL_MESSAGE = "I'm not able to help with that. If you'd like, tell me more about what you're actually trying to get done, and I'll do my best to help with that instead.";

export interface RunCompletionParams {
  userId: string;
  capability: AiCapability;
  conversationId?: string;
  messages: AiCompletionMessage[];
  maxTokens?: number;
  temperature?: number;
  tools?: AiToolDefinition[];
}

export interface RunWardCompletionParams {
  organizationId: string;
  wardConversationId: string;
  messages: AiCompletionMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  content: string;
  requestId: string;
  toolCalls?: AiToolCallRequest[];
  moderationBlocked?: boolean;
  moderationCategories?: string[];
}

const SPEND_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Unifies AI request history, cost tracking, and audit logging into one
 * completion path. Member QUESTION_ANSWERING also receives its governing
 * Member Steward scope here so no caller can accidentally send a real-life
 * need through the obsolete platform-helpdesk system prompt.
 */
@Injectable()
export class AiRequestsService {
  private readonly logger = new Logger(AiRequestsService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: IAiProvider,
    @Inject(AI_REQUEST_REPOSITORY) private readonly repo: IAiRequestRepository,
    private readonly operationalConfig: AiOperationalConfigService,
    private readonly moderation: ModerationService,
  ) {}

  async runCompletion(params: RunCompletionParams): Promise<CompletionResult> {
    await this.assertWithinBudget(params.userId, params.capability);
    const startedAt = Date.now();

    // ConversationsService historically supplies PLATFORM_ASSISTANT_SYSTEM_PROMPT
    // as message zero. That prompt scopes the Steward to explaining Aureus and
    // explicitly declines ordinary life needs. For member Q&A, replace that
    // first system instruction at this central audited boundary so text cannot
    // regress to help-desk behavior even if an older caller still imports it.
    // Additional system messages (for example visible interface context) are
    // retained unchanged.
    const messages =
      params.capability === AiCapability.QUESTION_ANSWERING
        ? params.messages.map((message, index) =>
            index === 0 && message.role === 'system'
              ? { ...message, content: MEMBER_STEWARD_SYSTEM_PROMPT }
              : message,
          )
        : params.messages;

    const moderationResult = await this.moderation.checkMessages(messages);
    if (moderationResult.flagged) {
      return this.recordModerationBlock(params, moderationResult.categories);
    }

    const safeMessages = wrapUntrustedUserContent(messages);

    try {
      const output = await this.provider.complete({
        messages: safeMessages,
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
   * Public Ward completion path. Anonymous visitors never become synthetic
   * Users and never inherit member memory or permissions. Their provider
   * calls still enter the same AiRequest ledger, global emergency stop,
   * platform ceiling, and per-capability ceiling as authenticated traffic.
   * The live per-user ceiling is conservatively reused as the per-tenant
   * Ward ceiling so one public business cannot consume the platform budget.
   */
  async runWardCompletion(params: RunWardCompletionParams): Promise<CompletionResult> {
    const capability = AiCapability.PUBLIC_WARD_CONVERSATION;
    await this.assertWardWithinBudget(params.organizationId, capability);
    const startedAt = Date.now();

    const moderationResult = await this.moderation.checkMessages(params.messages);
    if (moderationResult.flagged) {
      const request = await this.repo.create({
        organizationId: params.organizationId,
        wardConversationId: params.wardConversationId,
        capability,
        provider: this.provider.provider,
        model: 'moderation-block',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        latencyMs: 0,
        status: AiRequestStatus.MODERATION_BLOCKED,
        errorMessage: `Blocked by content moderation: ${moderationResult.categories.join(', ') || 'unspecified'}`,
      });

      return {
        content: moderationResult.categories.includes('self-harm')
          ? CRISIS_REDIRECT_MESSAGE
          : MODERATION_REFUSAL_MESSAGE,
        requestId: request.id,
        moderationBlocked: true,
        moderationCategories: moderationResult.categories,
      };
    }

    const safeMessages = wrapUntrustedUserContent(params.messages);

    try {
      const output = await this.provider.complete({
        messages: safeMessages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
        // Public Ward has no tools. It can explain or offer a human route;
        // it cannot navigate private UI or take an action for a visitor.
      });
      const latencyMs = Date.now() - startedAt;
      const request = await this.repo.create({
        organizationId: params.organizationId,
        wardConversationId: params.wardConversationId,
        capability,
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
        organizationId: params.organizationId,
        wardConversationId: params.wardConversationId,
        capability,
        provider: this.provider.provider,
        model: 'unknown',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        latencyMs,
        status: AiRequestStatus.FAILED,
        errorMessage,
      });

      this.logger.error(
        `Public Ward completion failed for tenant ${params.organizationId}: ${errorMessage}`,
      );
      throw new ServiceUnavailableException(
        'The Ward is temporarily unavailable. Your message was not sent to the business.',
      );
    }
  }

  private async recordModerationBlock(
    params: RunCompletionParams, categories: string[],
  ): Promise<CompletionResult> {
    const request = await this.repo.create({
      userId: params.userId,
      conversationId: params.conversationId,
      capability: params.capability,
      provider: this.provider.provider,
      model: 'moderation-block',
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      latencyMs: 0,
      status: AiRequestStatus.MODERATION_BLOCKED,
      errorMessage: `Blocked by content moderation: ${categories.join(', ') || 'unspecified'}`,
    });

    this.logger.warn(`AI request blocked by moderation for capability ${params.capability}: ${categories.join(', ')}`);

    const isSelfHarm = categories.includes('self-harm');
    return { content: isSelfHarm ? CRISIS_REDIRECT_MESSAGE : MODERATION_REFUSAL_MESSAGE, requestId: request.id };
  }


  async assertWithinBudget(userId: string, capability: AiCapability): Promise<void> {
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

    await this.enforceCapabilityCeiling(capability, since);
  }

  async assertWardWithinBudget(
    organizationId: string,
    capability: AiCapability,
  ): Promise<void> {
    const opConfig = await this.operationalConfig.getEffective();

    if (opConfig.emergencyStop) {
      throw new ServiceUnavailableException(
        'AI features are temporarily disabled by an emergency budget control. Please try again later.',
      );
    }

    const since = new Date(Date.now() - SPEND_WINDOW_MS);
    const globalSpend = await this.repo.sumCostSince(since);
    if (globalSpend >= opConfig.globalDailyBudgetUsd) {
      this.logger.warn(
        `Platform-wide AI daily budget reached: $${globalSpend.toFixed(4)} >= $${opConfig.globalDailyBudgetUsd}`,
      );
      throw new ServiceUnavailableException(
        'The platform-wide AI budget for today has been reached. Please try again tomorrow.',
      );
    }

    const tenantSpend = await this.repo.sumCostSince(
      since,
      undefined,
      undefined,
      organizationId,
    );
    if (tenantSpend >= opConfig.userDailyBudgetUsd) {
      this.logger.warn(
        `Tenant Ward daily budget reached for ${organizationId}: $${tenantSpend.toFixed(4)} >= $${opConfig.userDailyBudgetUsd}`,
      );
      throw new ServiceUnavailableException(
        'This business has reached its Ward usage limit for today. Please use the human contact route.',
      );
    }

    await this.enforceCapabilityCeiling(capability, since);
  }

  private async enforceCapabilityCeiling(capability: AiCapability, since: Date): Promise<void> {
    const budget = await this.operationalConfig.getCapabilityBudget(capability);
    if (!budget) return;

    if (budget.dailyBudgetUsd != null) {
      const spend = await this.repo.sumCostSince(since, undefined, capability);
      if (spend >= budget.dailyBudgetUsd) {
        this.logger.warn(`AI capability daily budget reached for ${capability}: ${spend.toFixed(4)} >= ${budget.dailyBudgetUsd}`);
        throw new ServiceUnavailableException(
          `The daily AI budget for this feature has been reached. Please try again tomorrow.`,
        );
      }
    }

    if (budget.dailyRequestLimit != null) {
      const count = await this.repo.countSince(since, capability);
      if (count >= budget.dailyRequestLimit) {
        this.logger.warn(`AI capability daily request limit reached for ${capability}: ${count} >= ${budget.dailyRequestLimit}`);
        throw new ServiceUnavailableException(
          `The daily usage limit for this feature has been reached. Please try again tomorrow.`,
        );
      }
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

  async getSpendByCapability(caller: AuthenticatedUser): Promise<AiCapabilitySpendResponseDto[]> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may view AI spend by capability');
    }

    const since = new Date(Date.now() - SPEND_WINDOW_MS);
    const summary = await this.repo.groupedByCapabilitySince(since);
    return summary.map(AiCapabilitySpendResponseDto.fromSummary);
  }
}
