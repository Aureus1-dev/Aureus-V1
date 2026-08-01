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
import { NeedsService } from '../../needs/needs.service';
import { OrchestrateRequestDto } from './dto/orchestrate-request.dto';
import { OrchestrateResponseDto } from './dto/orchestrate-response.dto';
import { OrchestrationRunResponseDto } from './dto/orchestration-run-response.dto';
import { CoordinatedPlanResponseDto, PlanItemDto, PlanItemSource } from './dto/coordinated-plan-response.dto';
import { ListOrchestrationRunsQueryDto } from './dto/list-orchestration-runs-query.dto';
import { PaginatedOrchestrationRunsResponseDto } from './dto/paginated-orchestration-runs-response.dto';
import { OrchestrationRoutingSummaryResponseDto } from './dto/orchestration-routing-summary-response.dto';
import {
  AI_ORCHESTRATION_RUN_REPOSITORY,
  IAiOrchestrationRunRepository,
} from './repositories/ai-orchestration-run.repository.interface';

const SUMMARY_WINDOW_MS = 24 * 60 * 60 * 1000;

// The fixed, documented priority order a coordinated plan falls back
// through when no City Sheet match is available — the same reliability-
// over-inference preference the rest of Gate C/the Recommendation Engine
// already applies (deterministic checks over free-form AI judgment).
// Mirrors resolveNextBestAction's existing category preference below.
const PLAN_CATEGORY_PRIORITY: RecommendationCategory[] = [
  RecommendationCategory.OPPORTUNITY,
  RecommendationCategory.RESOURCE,
  RecommendationCategory.COURSE,
  RecommendationCategory.POD,
];

interface RouteResult {
  status: AiOrchestrationStatus;
  outcome: string;
  capabilitiesInvoked: AiCapability[];
  recommendations?: RecommendationResponseDto[];
  insight?: InsightResponseDto;
  plan?: CoordinatedPlanResponseDto;
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
    private readonly needsService: NeedsService,
  ) {}

  async orchestrate(dto: OrchestrateRequestDto, caller: AuthenticatedUser): Promise<OrchestrateResponseDto> {
    const startedAt = Date.now();

    try {
      const result = await this.route(dto.goal, dto.needId, caller);
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
        plan: result.plan,
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

  private async route(goal: AiOrchestrationGoal, needId: string | undefined, caller: AuthenticatedUser): Promise<RouteResult> {
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
      case AiOrchestrationGoal.COORDINATED_PLAN:
        return this.viaCoordinatedPlan(caller, needId);
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

  /**
   * The one goal that returns more than a single delegate's worth of
   * results (deliverable: "search across every relevant system, return
   * one coordinated plan"). Every candidate still comes from an existing,
   * unmodified capability — `RecommendationsService.generate()` per
   * category, `NeedsService.findMatchingResources()` for the City Sheet —
   * called in parallel; this method only ranks and pairs what they
   * return. Ranking is a fixed, documented rule, not a second AI call:
   * a real City Sheet match is immediate, verified-or-honestly-labeled,
   * human-actionable help, so it leads when one exists; otherwise the
   * strongest available recommendation category leads, in the same
   * priority order `resolveNextBestAction` already uses. At most two
   * Supporting items are surfaced — "only genuinely useful supporting
   * steps," never padded to a fixed count.
   */
  private async viaCoordinatedPlan(caller: AuthenticatedUser, needId?: string): Promise<RouteResult> {
    const [cityMatches, perCategory] = await Promise.all([
      needId ? this.needsService.findMatchingResources(needId, caller.id) : Promise.resolve([]),
      Promise.all(PLAN_CATEGORY_PRIORITY.map((category) => this.recommendationsService.generate({ category }, caller))),
    ]);

    const candidates: PlanItemDto[] = [];
    if (cityMatches.length > 0) {
      candidates.push({
        source: PlanItemSource.CITY_RESOURCE,
        recommendation: null,
        cityResource: cityMatches[0],
        categoryLabel: 'Verified local resource',
      });
    }
    PLAN_CATEGORY_PRIORITY.forEach((category, i) => {
      for (const recommendation of perCategory[i]) {
        candidates.push({
          source: PlanItemSource.RECOMMENDATION,
          recommendation,
          cityResource: null,
          categoryLabel: recommendationCategoryLabel(category),
        });
      }
    });
    // Every City Sheet match beyond the one surfaced as (or alongside) the
    // primary item is still a real candidate, just not yet shown.
    const uncountedCityMatches = Math.max(0, cityMatches.length - 1);

    if (candidates.length === 0) {
      return {
        status: AiOrchestrationStatus.NO_ACTION,
        outcome: 'No real candidates were available across any category to build a plan from right now.',
        capabilitiesInvoked: [],
      };
    }

    const primary = candidates[0];
    const supporting = candidates.slice(1, 3);
    const additionalPossibilitiesCount = Math.max(0, candidates.length - 1 - supporting.length) + uncountedCityMatches;

    const plan: CoordinatedPlanResponseDto = {
      primary,
      supporting,
      combinedRationale: composeCombinedRationale(primary, supporting),
      additionalPossibilitiesCount,
    };

    return {
      status: AiOrchestrationStatus.SUCCESS,
      outcome: `Built a coordinated plan: ${primary.categoryLabel} leads, with ${supporting.length} supporting step(s) and ${additionalPossibilitiesCount} further possibility(ies) held in reserve.`,
      capabilitiesInvoked: [AiCapability.RECOMMENDATION],
      plan,
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

function recommendationCategoryLabel(category: RecommendationCategory): string {
  switch (category) {
    case RecommendationCategory.OPPORTUNITY: return 'Opportunity';
    case RecommendationCategory.RESOURCE: return 'Resource';
    case RecommendationCategory.COURSE: return 'Training';
    case RecommendationCategory.POD: return 'Community (Pod)';
    case RecommendationCategory.STEWARD_ESCALATION: return 'Steward escalation';
    default: return 'Recommendation';
  }
}

/**
 * Deterministic, template-composed — not a second AI call. A coordinated
 * plan's rationale for *why these fit together* is a short, fixed-shape
 * sentence built from what's already known (source + category of each
 * item); it does not need model variability, and avoiding it keeps this
 * goal's latency and cost bounded to the per-category `generate()` calls
 * already being made.
 */
function composeCombinedRationale(primary: PlanItemDto, supporting: PlanItemDto[]): string {
  const primaryLabel =
    primary.source === PlanItemSource.CITY_RESOURCE
      ? `${primary.categoryLabel} (${primary.cityResource!.organizationName})`
      : primary.categoryLabel;

  if (supporting.length === 0) {
    return `${primaryLabel} is the strongest real option available right now — nothing else found fit closely enough to include alongside it.`;
  }

  // De-duplicated: two supporting items from the same category produced
  // "Opportunity and Opportunity", which reads as a bug to the member.
  const uniqueLabels = [...new Set(supporting.map((item) => item.categoryLabel))];
  const supportingLabels = uniqueLabels.join(' and ');
  // "round out it" was ungrammatical; the object belongs inside the phrasal verb.
  const verb = uniqueLabels.length > 1 ? 'round it out' : 'rounds it out';
  return `${primaryLabel} addresses this most directly; ${supportingLabels} ${verb} — together they cover what's needed now and what helps beyond it.`;
}
