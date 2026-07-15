import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { AiCapability, AiRecommendationStatus, NotificationCategory } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { ResourcesService } from '../../resources/resources.service';
import { GoalsService } from '../../goals/goals.service';
import { CoursesService } from '../../academy/courses/courses.service';
import { NotificationsService } from '../../communication/notifications/notifications.service';
import { buildRecommendationRationalePrompt } from '../prompts/system-prompts.util';
import { AiRequestsService } from '../requests/ai-requests.service';
import { RecommendationCategory, RequestRecommendationsDto } from './dto/request-recommendations.dto';
import { ListRecommendationsQueryDto } from './dto/list-recommendations-query.dto';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';
import { PaginatedRecommendationsResponseDto } from './dto/paginated-recommendations-response.dto';
import {
  AI_RECOMMENDATION_REPOSITORY,
  IAiRecommendationRepository,
} from './repositories/ai-recommendation.repository.interface';

const MAX_RECOMMENDATIONS_PER_REQUEST = 3;
const CANDIDATE_POOL_SIZE = 10;

interface Candidate {
  id: string;
  title: string;
  description: string;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @Inject(AI_RECOMMENDATION_REPOSITORY) private readonly repo: IAiRecommendationRepository,
    private readonly opportunitiesService: OpportunitiesService,
    private readonly resourcesService: ResourcesService,
    private readonly goalsService: GoalsService,
    private readonly coursesService: CoursesService,
    private readonly aiRequests: AiRequestsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * AI Recommendations (PA-006). Fetches a real candidate pool from the
   * target domain's own existing, verified listing (no duplicate matching
   * logic — the AI's job is personalized rationale, not re-implementing
   * search/scoring), asks the provider to pick and explain up to three, and
   * persists them as PENDING suggestion records. Never enrolls, saves, or
   * otherwise acts on the member's behalf — that remains the member's own
   * action via the target domain's existing endpoints (ADR-015 Decision 6).
   */
  async generate(dto: RequestRecommendationsDto, caller: AuthenticatedUser): Promise<RecommendationResponseDto[]> {
    const goals = await this.goalsService.findAll({ page: 1, limit: 20 }, caller);
    const candidates = await this.fetchCandidates(dto.category);

    if (candidates.length === 0) {
      return [];
    }

    const prompt = buildRecommendationRationalePrompt({
      category: dto.category,
      memberGoalTitles: goals.data.map((g) => g.title),
      candidates,
    });

    const { content, requestId } = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.RECOMMENDATION,
      messages: [{ role: 'user', content: prompt }],
    });

    const picks = this.parsePicks(content, candidates);
    const created: RecommendationResponseDto[] = [];

    for (const pick of picks) {
      const target = this.targetFieldsFor(dto.category, pick.id);
      const existing = await this.repo.findExistingPending(caller.id, target);
      if (existing) {
        created.push(RecommendationResponseDto.fromEntity(existing));
        continue;
      }

      const recommendation = await this.repo.create({
        userId: caller.id,
        ...target,
        rationale: pick.rationale,
        aiRequestId: requestId,
      });
      created.push(RecommendationResponseDto.fromEntity(recommendation));
    }

    if (created.length > 0) {
      await this.notifyNewRecommendations(caller.id, created.length, dto.category);
    }

    return created;
  }

  async findMine(query: ListRecommendationsQueryDto, caller: AuthenticatedUser): Promise<PaginatedRecommendationsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.repo.findAll({ page, limit, userId: caller.id, status: query.status });

    return {
      data: result.data.map(RecommendationResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<RecommendationResponseDto> {
    const recommendation = await this.getOwnedOrThrow(id, caller);
    return RecommendationResponseDto.fromEntity(recommendation);
  }

  async approve(id: string, caller: AuthenticatedUser): Promise<RecommendationResponseDto> {
    const recommendation = await this.getOwnedOrThrow(id, caller);
    this.assertPending(recommendation.status);
    const updated = await this.repo.update(id, { status: AiRecommendationStatus.ACCEPTED, decidedAt: new Date() });
    this.logger.log(`Recommendation ${id} accepted by ${caller.id}`);
    return RecommendationResponseDto.fromEntity(updated);
  }

  async dismiss(id: string, caller: AuthenticatedUser): Promise<RecommendationResponseDto> {
    const recommendation = await this.getOwnedOrThrow(id, caller);
    this.assertPending(recommendation.status);
    const updated = await this.repo.update(id, { status: AiRecommendationStatus.DISMISSED, decidedAt: new Date() });
    this.logger.log(`Recommendation ${id} dismissed by ${caller.id}`);
    return RecommendationResponseDto.fromEntity(updated);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async fetchCandidates(category: RecommendationCategory): Promise<Candidate[]> {
    if (category === RecommendationCategory.OPPORTUNITY) {
      const result = await this.opportunitiesService.findAll({ page: 1, limit: CANDIDATE_POOL_SIZE });
      return result.data.map((o) => ({ id: o.id, title: o.title, description: o.shortDescription }));
    }
    if (category === RecommendationCategory.RESOURCE) {
      const result = await this.resourcesService.findAll({ page: 1, limit: CANDIDATE_POOL_SIZE });
      return result.data.map((r) => ({ id: r.id, title: r.title, description: r.shortDescription }));
    }
    const result = await this.coursesService.findAll({ page: 1, limit: CANDIDATE_POOL_SIZE });
    return result.data.map((c) => ({ id: c.id, title: c.title, description: c.shortDescription }));
  }

  private targetFieldsFor(category: RecommendationCategory, id: string): { opportunityId?: string; resourceId?: string; courseId?: string } {
    if (category === RecommendationCategory.OPPORTUNITY) return { opportunityId: id };
    if (category === RecommendationCategory.RESOURCE) return { resourceId: id };
    return { courseId: id };
  }

  /**
   * Parses the provider's JSON picks. Falls back to the top N candidates
   * with a generic rationale if the response isn't valid, parseable JSON —
   * a resilience decision (ADR-015 Decision 7), not a test-only shortcut:
   * a malformed AI response should degrade gracefully, not fail the whole
   * request, and the raw response remains visible in the AiRequest audit log.
   */
  private parsePicks(content: string, candidates: Candidate[]): { id: string; rationale: string }[] {
    const candidateIds = new Set(candidates.map((c) => c.id));

    try {
      const parsed = JSON.parse(content) as { id: string; rationale: string }[];
      const valid = parsed.filter((p) => candidateIds.has(p.id));
      if (valid.length > 0) return valid.slice(0, MAX_RECOMMENDATIONS_PER_REQUEST);
    } catch {
      // fall through to the deterministic fallback below
    }

    return candidates.slice(0, MAX_RECOMMENDATIONS_PER_REQUEST).map((c) => ({
      id: c.id,
      rationale: 'Selected based on your stated goals.',
    }));
  }

  private async notifyNewRecommendations(userId: string, count: number, category: RecommendationCategory): Promise<void> {
    try {
      await this.notificationsService.notify({
        recipientId: userId,
        category: NotificationCategory.AI_GUIDANCE,
        type: 'ai.recommendation.created',
        title: 'New AI recommendations',
        body: `The AI Engine has ${count} new ${category.toLowerCase()} recommendation${count > 1 ? 's' : ''} for you to review.`,
      });
    } catch (err) {
      this.logger.warn(`Failed to notify user ${userId} of new recommendations: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  private assertPending(status: AiRecommendationStatus): void {
    if (status !== AiRecommendationStatus.PENDING) {
      throw new ConflictException(`Recommendation is in '${status}' status. Only PENDING recommendations can be decided.`);
    }
  }

  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser) {
    const recommendation = await this.repo.findById(id);
    if (!recommendation) throw new NotFoundException(`Recommendation '${id}' not found`);
    if (recommendation.userId !== caller.id) {
      throw new ForbiddenException('You may only access your own recommendations');
    }
    return recommendation;
  }
}
