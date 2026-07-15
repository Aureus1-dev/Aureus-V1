import { Injectable } from '@nestjs/common';
import { AiCapability } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { ResourcesService } from '../../resources/resources.service';
import { JourneysService } from '../../journeys/journeys.service';
import { GoalsService } from '../../goals/goals.service';
import { MilestonesService } from '../../milestones/milestones.service';
import { CoursesService } from '../../academy/courses/courses.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import {
  buildAcademyGuidancePrompt,
  buildJourneyGuidancePrompt,
  buildKnowledgeSearchPrompt,
  buildOpportunityExplanationPrompt,
  buildResourceExplanationPrompt,
} from '../prompts/system-prompts.util';
import { AiRequestsService } from '../requests/ai-requests.service';
import { InsightResponseDto } from './dto/insight-response.dto';
import { KnowledgeSearchDto } from './dto/knowledge-search.dto';
import { KnowledgeSearchResponseDto } from './dto/knowledge-search-response.dto';

/**
 * "Tool orchestration" (PA-006 / ADR-015 Decision 4) for Aureus: each method
 * here deterministically calls across existing domain services to assemble
 * grounding context, then calls the AI provider once via AiRequestsService.
 * This is orchestration in the sense of "coordinate calls to existing
 * platform tools," not an LLM-driven agent loop that decides what to call —
 * explicitly out of scope per the WO-029 directive ("do not build autonomous
 * agents").
 */
@Injectable()
export class InsightsService {
  constructor(
    private readonly opportunitiesService: OpportunitiesService,
    private readonly resourcesService: ResourcesService,
    private readonly journeysService: JourneysService,
    private readonly goalsService: GoalsService,
    private readonly milestonesService: MilestonesService,
    private readonly coursesService: CoursesService,
    private readonly knowledgeService: KnowledgeService,
    private readonly aiRequests: AiRequestsService,
  ) {}

  async explainOpportunity(id: string, caller: AuthenticatedUser): Promise<InsightResponseDto> {
    const opportunity = await this.opportunitiesService.findById(id);
    const prompt = buildOpportunityExplanationPrompt(opportunity);

    const { content, requestId } = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.OPPORTUNITY_EXPLANATION,
      messages: [{ role: 'user', content: prompt }],
    });

    return { content, requestId };
  }

  async explainResource(id: string, caller: AuthenticatedUser): Promise<InsightResponseDto> {
    const resource = await this.resourcesService.findById(id);
    const prompt = buildResourceExplanationPrompt(resource);

    const { content, requestId } = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.RESOURCE_EXPLANATION,
      messages: [{ role: 'user', content: prompt }],
    });

    return { content, requestId };
  }

  async journeyGuidance(journeyId: string, caller: AuthenticatedUser): Promise<InsightResponseDto> {
    const journey = await this.journeysService.findById(journeyId, caller);
    const goal = await this.goalsService.findById(journey.goalId, caller);
    const milestones = await this.milestonesService.findAll({ journeyId, page: 1, limit: 50 }, caller);

    const prompt = buildJourneyGuidancePrompt({
      goalTitle: goal.title,
      journeyStatus: journey.status,
      milestones: milestones.data.map((m) => ({ title: m.title, status: m.status })),
    });

    const { content, requestId } = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.JOURNEY_GUIDANCE,
      messages: [{ role: 'user', content: prompt }],
    });

    return { content, requestId };
  }

  async academyGuidance(courseId: string, caller: AuthenticatedUser): Promise<InsightResponseDto> {
    const course = await this.coursesService.findById(courseId);
    const goals = await this.goalsService.findAll({ page: 1, limit: 20 }, caller);

    const prompt = buildAcademyGuidancePrompt({
      courseTitle: course.title,
      courseShortDescription: course.shortDescription,
      learningDomain: course.learningDomain,
      memberGoalTitles: goals.data.map((g) => g.title),
    });

    const { content, requestId } = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.ACADEMY_GUIDANCE,
      messages: [{ role: 'user', content: prompt }],
    });

    return { content, requestId };
  }

  async knowledgeSearch(dto: KnowledgeSearchDto, caller: AuthenticatedUser): Promise<KnowledgeSearchResponseDto> {
    const results = await this.knowledgeService.findAll({ q: dto.query, page: 1, limit: 5 });
    const prompt = buildKnowledgeSearchPrompt(dto.query, results.data.map((a) => ({ title: a.title, summary: a.summary })));

    const { content, requestId } = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.KNOWLEDGE_SEARCH,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      content,
      requestId,
      sources: results.data.map((a) => ({ id: a.id, articleRef: a.articleRef, title: a.title })),
    };
  }
}
