import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AiCapability, AiOrchestrationGoal, AiOrchestrationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/ai-roles.util';
import { InstitutionalMemoryService, InstitutionalMemoryContext } from '../memory/institutional-memory.service';
import { InsightsService } from '../insights/insights.service';
import { InsightResponseDto } from '../insights/dto/insight-response.dto';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { RecommendationCategory } from '../recommendations/dto/request-recommendations.dto';
import { RecommendationResponseDto } from '../recommendations/dto/recommendation-response.dto';
import { OrchestrateRequestDto } from './dto/orchestrate-request.dto';
import { OrchestrateResponseDto } from './dto/orchestrate-response.dto';
import { OrchestrationRunResponseDto } from './dto/orchestration-run-response.dto';
import { ListOrchestrationRunsQueryDto } from './dto/list-orchestration-runs-query.dto';
import { PaginatedOrchestrationRunsResponseDto } from './dto/paginated-orchestration-runs-response.dto';
import { OrchestrationRoutingSummaryResponseDto } from './dto/orchestration-routing-summary-response.dto';
import {
  AI_ORCHESTRATION_RUN_REPOSITORY,
  IAiOrchestrationRunRepository,
} from './repositories/ai-orchestration-run.repository.interface';

const SUMMARY_WINDOW_MS = 24 * 60 * 60 * 1000;

interface RouteResult {
  status: AiOrchestrationStatus;
  outcome: string;
  capabilitiesInvoked: AiCapability[];
  recommendations?: RecommendationResponseDto[];
  insight?: InsightResponseDto;
}

/**
 * AI Orchestrator (PR-004 Intelligence Layer). A thin, deterministic
 * routing/coordination layer over the AI Engine's existing capabilities —
 * never a free-form LLM-driven agent loop (the same boundary
 * `InsightsService` already documents for its own "tool orchestration").
 * Every goal is served by delegating to a capability that already exists
 * and is already audited through `AiRequestsService.runCompletion()`; this
 * service adds no new prompt/provider logic of its own, only decides which
 * existing capability applies and records why (`AiOrchestrationRun.outcome`
 * is always a human-readable explanation — every recommendation remains
 * advisory-only and auditable). Human stewardship always overrides AI: the
 * STEWARD_ESCALATION goal only ever produces a member-facing suggestion to
 * reach out, exactly like `RecommendationsService` already enforces —
 * nothing here ever files an escalation on a member's behalf.
 */
@Injectable()
export class AiOrchestratorService {
  constructor(
    @Inject(AI_ORCHESTRATION_RUN_REPOSITORY) private readonly repo: IAiOrchestrationRunRepository,
    private readonly memory: InstitutionalMemoryService,
    private readonly insightsService: InsightsService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  async orchestrate(dto: OrchestrateRequestDto, caller: AuthenticatedUser): Promise<OrchestrateResponseDto> {
    const startedAt = Date.now();

    try {
      const result = await this.route(dto.goal, caller);
      const run = await this.repo.create({
        userId: caller.id,
        goal: dto.goal,
        capabilitiesInvoked: result.capabilitiesInvoked,
        outcome: result.outcome,
        status: result.status,
        latencyMs: Date.now() - startedAt,
      });

      return {
        run: OrchestrationRunResponseDto.fromEntity(run),
        recommendations: result.recommendations,
        insight: result.insight,
      };
    } catch (err) {
      await this.repo.create({
        userId: caller.id,
        goal: dto.goal,
        capabilitiesInvoked: [],
        outcome: `Orchestration failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        status: AiOrchestrationStatus.FAILED,
        latencyMs: Date.now() - startedAt,
      });
      throw err;
    }
  }

  async findMine(query: ListOrchestrationRunsQueryDto, caller: AuthenticatedUser): Promise<PaginatedOrchestrationRunsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.repo.findAll({ page, limit, userId: caller.id, goal: query.goal });

    return {
      data: result.data.map(OrchestrationRunResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  /** Platform-wide orchestration run log (PR-004 Founder visibility — no per-caller scope). */
  async findAllAdmin(query: ListOrchestrationRunsQueryDto, caller: AuthenticatedUser): Promise<PaginatedOrchestrationRunsResponseDto> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may view the platform-wide orchestration run log');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repo.findAll({
      page, limit, userId: query.userId, goal: query.goal, status: query.status,
    });

    return {
      data: result.data.map(OrchestrationRunResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  /** Platform-wide orchestration routing activity over the current rolling-24h window (PR-004 Founder visibility). */
  async getRoutingSummary(caller: AuthenticatedUser): Promise<OrchestrationRoutingSummaryResponseDto> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may view the platform-wide orchestration routing summary');
    }

    const since = new Date(Date.now() - SUMMARY_WINDOW_MS);
    const [runsInWindow, runsByGoal] = await Promise.all([
      this.repo.countSince(since),
      this.repo.countByGoalSince(since),
    ]);
    return { runsInWindow, runsByGoal };
  }

  // ── Routing (deterministic — never a free-form agent choice) ──────────

  private async route(goal: AiOrchestrationGoal, caller: AuthenticatedUser): Promise<RouteResult> {
    switch (goal) {
      case AiOrchestrationGoal.OPPORTUNITY_SUGGESTION:
        return this.viaRecommendation(RecommendationCategory.OPPORTUNITY, AiCapability.RECOMMENDATION, caller);
      case AiOrchestrationGoal.RESOURCE_SUGGESTION:
        return this.viaRecommendation(RecommendationCategory.RESOURCE, AiCapability.RECOMMENDATION, caller);
      case AiOrchestrationGoal.EDUCATIONAL_RECOMMENDATION:
        return this.viaRecommendation(RecommendationCategory.COURSE, AiCapability.RECOMMENDATION, caller);
      case AiOrchestrationGoal.STEWARD_ESCALATION:
        return this.viaRecommendation(RecommendationCategory.STEWARD_ESCALATION, AiCapability.STEWARD_ESCALATION, caller);
      case AiOrchestrationGoal.JOURNEY_GUIDANCE:
        return this.viaJourneyGuidance(caller);
      case AiOrchestrationGoal.NEXT_BEST_ACTION:
        return this.viaNextBestAction(caller);
      default:
        return { status: AiOrchestrationStatus.NO_ACTION, outcome: `Unrecognized orchestration goal '${goal}'.`, capabilitiesInvoked: [] };
    }
  }

  private async viaRecommendation(
    category: RecommendationCategory,
    taggedAs: AiCapability,
    caller: AuthenticatedUser,
  ): Promise<RouteResult> {
    const recommendations = await this.recommendationsService.generate({ category }, caller);
    if (recommendations.length === 0) {
      return {
        status: AiOrchestrationStatus.NO_ACTION,
        outcome: `No ${category.toLowerCase()} candidates were available to recommend right now.`,
        capabilitiesInvoked: [],
        recommendations: [],
      };
    }
    return {
      status: AiOrchestrationStatus.SUCCESS,
      outcome: `Generated ${recommendations.length} ${category.toLowerCase()} recommendation(s), each with its own rationale.`,
      capabilitiesInvoked: [taggedAs],
      recommendations,
    };
  }

  private async viaJourneyGuidance(caller: AuthenticatedUser, context?: InstitutionalMemoryContext): Promise<RouteResult> {
    const ctx = context ?? (await this.memory.assembleContext(caller));
    if (!ctx.activeJourney) {
      return { status: AiOrchestrationStatus.NO_ACTION, outcome: 'No active Journey was found to offer guidance on.', capabilitiesInvoked: [] };
    }

    const insight = await this.insightsService.journeyGuidance(ctx.activeJourney.id, caller);
    return {
      status: AiOrchestrationStatus.SUCCESS,
      outcome: `Provided guidance on the active Journey "${ctx.activeJourney.title}".`,
      capabilitiesInvoked: [AiCapability.JOURNEY_GUIDANCE],
      insight,
    };
  }

  /**
   * The one goal with no 1:1 existing capability (deliverable §3 "Next best
   * action"). A documented, deterministic decision tree over Shared
   * Institutional Memory — every branch still delegates to an existing,
   * already-audited capability; this method only decides which one applies.
   */
  private async viaNextBestAction(caller: AuthenticatedUser): Promise<RouteResult> {
    const context = await this.memory.assembleContext(caller);
    const delegate = await this.resolveNextBestAction(context, caller);

    return {
      ...delegate,
      capabilitiesInvoked: [AiCapability.NEXT_BEST_ACTION, ...delegate.capabilitiesInvoked],
      outcome: `Next best action: ${delegate.outcome}`,
    };
  }

  private async resolveNextBestAction(context: InstitutionalMemoryContext, caller: AuthenticatedUser): Promise<RouteResult> {
    if (context.activeJourney && context.activeJourney.completedMilestones < context.activeJourney.totalMilestones) {
      return this.viaJourneyGuidance(caller, context);
    }

    if (context.stewardshipRelationship) {
      const result = await this.viaRecommendation(RecommendationCategory.STEWARD_ESCALATION, AiCapability.STEWARD_ESCALATION, caller);
      if (result.status !== AiOrchestrationStatus.NO_ACTION) return result;
    }

    if (context.goals.length === 0) {
      return this.viaRecommendation(RecommendationCategory.OPPORTUNITY, AiCapability.RECOMMENDATION, caller);
    }

    const resourceResult = await this.viaRecommendation(RecommendationCategory.RESOURCE, AiCapability.RECOMMENDATION, caller);
    if (resourceResult.status !== AiOrchestrationStatus.NO_ACTION) return resourceResult;

    return { status: AiOrchestrationStatus.NO_ACTION, outcome: 'no candidate action was available right now.', capabilitiesInvoked: [] };
  }
}
