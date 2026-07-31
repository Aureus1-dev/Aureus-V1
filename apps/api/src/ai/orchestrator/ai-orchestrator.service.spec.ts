import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AiCapability, AiOrchestrationGoal, AiOrchestrationStatus, GoalStatus, UserRole } from '@prisma/client';
import { AiOrchestratorService } from './ai-orchestrator.service';
import {
  AI_ORCHESTRATION_RUN_REPOSITORY,
  IAiOrchestrationRunRepository,
} from './repositories/ai-orchestration-run.repository.interface';
import { InstitutionalMemoryService, InstitutionalMemoryContext } from '../memory/institutional-memory.service';
import { InsightsService } from '../insights/insights.service';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { RecommendationCategory } from '../recommendations/dto/request-recommendations.dto';
import { NeedsService } from '../../needs/needs.service';
import { PlanItemSource } from './dto/coordinated-plan-response.dto';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { AiOrchestrationRun } from '@prisma/client';
import type { MatchedResourceDto } from '../../needs/dto/matched-resource.dto';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const USER: AuthenticatedUser = { id: 'user-001', email: 'user@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const EMPTY_CONTEXT: InstitutionalMemoryContext = {
  goals: [], activeJourney: null, savedOpportunities: [], savedResources: [],
  podMemberships: [], stewardshipRelationship: null, recentConversationSnippets: [],
};

const mockRepo: jest.Mocked<IAiOrchestrationRunRepository> = {
  create: jest.fn(), findAll: jest.fn(), countSince: jest.fn(), countByGoalSince: jest.fn(),
};
const mockMemory = { assembleContext: jest.fn() } as unknown as jest.Mocked<InstitutionalMemoryService>;
const mockInsightsService = { journeyGuidance: jest.fn() } as unknown as jest.Mocked<InsightsService>;
const mockRecommendationsService = { generate: jest.fn() } as unknown as jest.Mocked<RecommendationsService>;
const mockNeedsService = { findMatchingResources: jest.fn() } as unknown as jest.Mocked<NeedsService>;

const makeCityResource = (o: Partial<MatchedResourceDto> = {}): MatchedResourceDto => ({
  id: 'city-001', citySheetRef: 'AUR-CS-000001', organizationName: 'Chester County Food Bank',
  category: 'FOOD_RESOURCE' as never, description: 'Food pantry', address: null, serviceArea: 'Chester County',
  phone: '610-555-0100', website: null, hours: 'Mon-Fri 9-5', eligibilityRequirements: null,
  languagesSupported: [], accessibilityNotes: null, cost: null, requiredDocuments: [],
  referralRequired: false, isEmergencyService: false, verificationStatus: 'VERIFIED' as never,
  isTestFixture: false, ...o,
});

const makeRun = (o: Partial<AiOrchestrationRun> = {}): AiOrchestrationRun => ({
  id: 'run-001', userId: USER.id, goal: AiOrchestrationGoal.OPPORTUNITY_SUGGESTION,
  capabilitiesInvoked: [AiCapability.RECOMMENDATION], outcome: 'Generated 1 recommendation.',
  status: AiOrchestrationStatus.SUCCESS, latencyMs: 5, createdAt: NOW, ...o,
});

describe('AiOrchestratorService', () => {
  let service: AiOrchestratorService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        AiOrchestratorService,
        { provide: AI_ORCHESTRATION_RUN_REPOSITORY, useValue: mockRepo },
        { provide: InstitutionalMemoryService, useValue: mockMemory },
        { provide: InsightsService, useValue: mockInsightsService },
        { provide: RecommendationsService, useValue: mockRecommendationsService },
        { provide: NeedsService, useValue: mockNeedsService },
      ],
    }).compile();
    service = m.get(AiOrchestratorService);
    jest.clearAllMocks();
    mockRepo.create.mockResolvedValue(makeRun());
    mockNeedsService.findMatchingResources.mockResolvedValue([]);
    mockRecommendationsService.generate.mockResolvedValue([]);
  });

  describe('orchestrate — direct delegation goals', () => {
    it('OPPORTUNITY_SUGGESTION delegates to RecommendationsService and records a SUCCESS run', async () => {
      mockRecommendationsService.generate.mockResolvedValue([{ id: 'rec-001' } as never]);

      const result = await service.orchestrate({ goal: AiOrchestrationGoal.OPPORTUNITY_SUGGESTION }, USER);

      expect(mockRecommendationsService.generate).toHaveBeenCalledWith({ category: RecommendationCategory.OPPORTUNITY }, USER);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: USER.id, goal: AiOrchestrationGoal.OPPORTUNITY_SUGGESTION,
        capabilitiesInvoked: [AiCapability.RECOMMENDATION], status: AiOrchestrationStatus.SUCCESS,
      }));
      expect(result.recommendations).toHaveLength(1);
    });

    it('records NO_ACTION when RecommendationsService returns no candidates', async () => {
      mockRecommendationsService.generate.mockResolvedValue([]);

      await service.orchestrate({ goal: AiOrchestrationGoal.RESOURCE_SUGGESTION }, USER);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: AiOrchestrationStatus.NO_ACTION, capabilitiesInvoked: [] }));
    });

    it('STEWARD_ESCALATION tags the run with AiCapability.STEWARD_ESCALATION, not the generic RECOMMENDATION tag', async () => {
      mockRecommendationsService.generate.mockResolvedValue([{ id: 'rec-001' } as never]);

      await service.orchestrate({ goal: AiOrchestrationGoal.STEWARD_ESCALATION }, USER);

      expect(mockRecommendationsService.generate).toHaveBeenCalledWith({ category: RecommendationCategory.STEWARD_ESCALATION }, USER);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ capabilitiesInvoked: [AiCapability.STEWARD_ESCALATION] }));
    });

    it('JOURNEY_GUIDANCE assembles memory context and delegates to InsightsService when an active Journey exists', async () => {
      mockMemory.assembleContext.mockResolvedValue({
        ...EMPTY_CONTEXT,
        activeJourney: { id: 'journey-001', goalId: 'goal-001', title: 'Savings Journey', completedMilestones: 1, totalMilestones: 3 },
      });
      mockInsightsService.journeyGuidance.mockResolvedValue({ content: 'Keep going!', requestId: 'req-001' });

      const result = await service.orchestrate({ goal: AiOrchestrationGoal.JOURNEY_GUIDANCE }, USER);

      expect(mockInsightsService.journeyGuidance).toHaveBeenCalledWith('journey-001', USER);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ capabilitiesInvoked: [AiCapability.JOURNEY_GUIDANCE], status: AiOrchestrationStatus.SUCCESS }));
      expect(result.insight?.content).toBe('Keep going!');
    });

    it('JOURNEY_GUIDANCE records NO_ACTION when there is no active Journey', async () => {
      mockMemory.assembleContext.mockResolvedValue(EMPTY_CONTEXT);

      await service.orchestrate({ goal: AiOrchestrationGoal.JOURNEY_GUIDANCE }, USER);

      expect(mockInsightsService.journeyGuidance).not.toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: AiOrchestrationStatus.NO_ACTION }));
    });
  });

  describe('orchestrate — NEXT_BEST_ACTION decision tree', () => {
    it('prioritizes continuing an active Journey with incomplete milestones over every other branch', async () => {
      mockMemory.assembleContext.mockResolvedValue({
        ...EMPTY_CONTEXT,
        activeJourney: { id: 'journey-001', goalId: 'goal-001', title: 'Savings Journey', completedMilestones: 1, totalMilestones: 3 },
        stewardshipRelationship: { id: 'rel-001', stewardId: 'steward-001', status: 'ACTIVE' as never },
      });
      mockInsightsService.journeyGuidance.mockResolvedValue({ content: 'Keep going!', requestId: 'req-001' });

      await service.orchestrate({ goal: AiOrchestrationGoal.NEXT_BEST_ACTION }, USER);

      expect(mockInsightsService.journeyGuidance).toHaveBeenCalled();
      expect(mockRecommendationsService.generate).not.toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        capabilitiesInvoked: [AiCapability.NEXT_BEST_ACTION, AiCapability.JOURNEY_GUIDANCE],
      }));
    });

    it('falls back to a Steward-escalation suggestion when there is an active relationship but no incomplete Journey', async () => {
      mockMemory.assembleContext.mockResolvedValue({
        ...EMPTY_CONTEXT,
        stewardshipRelationship: { id: 'rel-001', stewardId: 'steward-001', status: 'ACTIVE' as never },
      });
      mockRecommendationsService.generate.mockResolvedValue([{ id: 'rec-001' } as never]);

      await service.orchestrate({ goal: AiOrchestrationGoal.NEXT_BEST_ACTION }, USER);

      expect(mockRecommendationsService.generate).toHaveBeenCalledWith({ category: RecommendationCategory.STEWARD_ESCALATION }, USER);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        capabilitiesInvoked: [AiCapability.NEXT_BEST_ACTION, AiCapability.STEWARD_ESCALATION],
      }));
    });

    it('falls back to an Opportunity suggestion when the caller has no goals at all', async () => {
      mockMemory.assembleContext.mockResolvedValue(EMPTY_CONTEXT);
      mockRecommendationsService.generate.mockResolvedValue([{ id: 'rec-001' } as never]);

      await service.orchestrate({ goal: AiOrchestrationGoal.NEXT_BEST_ACTION }, USER);

      expect(mockRecommendationsService.generate).toHaveBeenCalledWith({ category: RecommendationCategory.OPPORTUNITY }, USER);
    });

    it('falls back to a Resource suggestion when the caller has goals but no Journey/steward action applies', async () => {
      mockMemory.assembleContext.mockResolvedValue({
        ...EMPTY_CONTEXT,
        goals: [{ id: 'goal-001', title: 'Save $1000', status: GoalStatus.ACHIEVED }],
      });
      mockRecommendationsService.generate.mockResolvedValue([{ id: 'rec-001' } as never]);

      await service.orchestrate({ goal: AiOrchestrationGoal.NEXT_BEST_ACTION }, USER);

      expect(mockRecommendationsService.generate).toHaveBeenCalledWith({ category: RecommendationCategory.RESOURCE }, USER);
    });

    it('records NO_ACTION when no candidate action is available anywhere in the tree', async () => {
      mockMemory.assembleContext.mockResolvedValue({
        ...EMPTY_CONTEXT,
        goals: [{ id: 'goal-001', title: 'Save $1000', status: GoalStatus.ACHIEVED }],
      });
      mockRecommendationsService.generate.mockResolvedValue([]);

      await service.orchestrate({ goal: AiOrchestrationGoal.NEXT_BEST_ACTION }, USER);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        status: AiOrchestrationStatus.NO_ACTION, capabilitiesInvoked: [AiCapability.NEXT_BEST_ACTION],
      }));
    });
  });

  describe('orchestrate — COORDINATED_PLAN', () => {
    it('calls RecommendationsService once per category, in the documented priority order, in parallel', async () => {
      mockRecommendationsService.generate.mockResolvedValue([{ id: 'rec-001' } as never]);

      await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN }, USER);

      expect(mockRecommendationsService.generate.mock.calls.map((c) => c[0])).toEqual([
        { category: RecommendationCategory.OPPORTUNITY },
        { category: RecommendationCategory.RESOURCE },
        { category: RecommendationCategory.COURSE },
        { category: RecommendationCategory.POD },
      ]);
    });

    it('does not call NeedsService when no needId is given', async () => {
      mockRecommendationsService.generate.mockResolvedValue([{ id: 'rec-001' } as never]);

      await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN }, USER);

      expect(mockNeedsService.findMatchingResources).not.toHaveBeenCalled();
    });

    it('calls NeedsService.findMatchingResources with the given needId, scoped to the caller', async () => {
      mockRecommendationsService.generate.mockResolvedValue([{ id: 'rec-001' } as never]);

      await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN, needId: 'need-001' }, USER);

      expect(mockNeedsService.findMatchingResources).toHaveBeenCalledWith('need-001', USER.id);
    });

    it('records NO_ACTION when no real candidates exist anywhere', async () => {
      const result = await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN, needId: 'need-001' }, USER);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: AiOrchestrationStatus.NO_ACTION }));
      expect(result.plan).toBeUndefined();
    });

    it('a real City Sheet match leads the plan as primary, ahead of any recommendation category', async () => {
      mockNeedsService.findMatchingResources.mockResolvedValue([makeCityResource()]);
      mockRecommendationsService.generate.mockImplementation((dto: never) =>
        Promise.resolve([{ id: `rec-${(dto as { category: string }).category}` } as never]),
      );

      const result = await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN, needId: 'need-001' }, USER);

      expect(result.plan!.primary.source).toBe(PlanItemSource.CITY_RESOURCE);
      expect(result.plan!.primary.cityResource!.organizationName).toBe('Chester County Food Bank');
      // Opportunity (highest-priority non-empty category) becomes supporting.
      expect(result.plan!.supporting[0].source).toBe(PlanItemSource.RECOMMENDATION);
      expect(result.plan!.supporting[0].recommendation!.id).toBe('rec-OPPORTUNITY');
    });

    it('falls back to the highest-priority non-empty recommendation category as primary when there is no City Sheet match', async () => {
      mockRecommendationsService.generate.mockImplementation((dto: never) => {
        const category = (dto as { category: string }).category;
        if (category === RecommendationCategory.RESOURCE) return Promise.resolve([{ id: 'rec-resource' } as never]);
        return Promise.resolve([]);
      });

      const result = await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN }, USER);

      expect(result.plan!.primary.source).toBe(PlanItemSource.RECOMMENDATION);
      expect(result.plan!.primary.recommendation!.id).toBe('rec-resource');
      expect(result.plan!.supporting).toHaveLength(0);
    });

    it('caps supporting steps at two, never padding to a fixed count, and counts the rest as held in reserve', async () => {
      mockRecommendationsService.generate.mockImplementation((dto: never) => {
        const category = (dto as { category: string }).category;
        if (category === RecommendationCategory.OPPORTUNITY) {
          return Promise.resolve([{ id: 'opp-1' }, { id: 'opp-2' }, { id: 'opp-3' }] as never);
        }
        if (category === RecommendationCategory.RESOURCE) return Promise.resolve([{ id: 'res-1' }] as never);
        return Promise.resolve([]);
      });

      const result = await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN }, USER);

      // 4 real candidates total (opp-1/2/3, res-1); primary=opp-1, supporting=[opp-2, opp-3] (capped at 2), res-1 held in reserve.
      expect(result.plan!.primary.recommendation!.id).toBe('opp-1');
      expect(result.plan!.supporting.map((s) => s.recommendation!.id)).toEqual(['opp-2', 'opp-3']);
      expect(result.plan!.additionalPossibilitiesCount).toBe(1);
    });

    it('counts every City Sheet match beyond the one surfaced as an additional possibility', async () => {
      mockNeedsService.findMatchingResources.mockResolvedValue([makeCityResource(), makeCityResource({ id: 'city-002' }), makeCityResource({ id: 'city-003' })]);

      const result = await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN, needId: 'need-001' }, USER);

      expect(result.plan!.primary.source).toBe(PlanItemSource.CITY_RESOURCE);
      expect(result.plan!.additionalPossibilitiesCount).toBe(2);
    });

    it('produces a non-empty combined rationale that changes based on whether supporting steps exist', async () => {
      mockRecommendationsService.generate.mockImplementation((dto: never) => {
        const category = (dto as { category: string }).category;
        if (category === RecommendationCategory.OPPORTUNITY) return Promise.resolve([{ id: 'opp-1' }] as never);
        return Promise.resolve([]);
      });

      const soloResult = await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN }, USER);
      expect(soloResult.plan!.combinedRationale.length).toBeGreaterThan(0);
      expect(soloResult.plan!.combinedRationale).toContain('strongest real option');

      mockRecommendationsService.generate.mockImplementation((dto: never) => {
        const category = (dto as { category: string }).category;
        if (category === RecommendationCategory.OPPORTUNITY) return Promise.resolve([{ id: 'opp-1' }] as never);
        if (category === RecommendationCategory.COURSE) return Promise.resolve([{ id: 'course-1' }] as never);
        return Promise.resolve([]);
      });
      const pairedResult = await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN }, USER);
      expect(pairedResult.plan!.combinedRationale).not.toContain('strongest real option');
      expect(pairedResult.plan!.combinedRationale).toContain('Opportunity');
      expect(pairedResult.plan!.combinedRationale).toContain('Training');
    });

    it('tags the run with the RECOMMENDATION capability and records a SUCCESS status', async () => {
      mockRecommendationsService.generate.mockImplementation((dto: never) => {
        const category = (dto as { category: string }).category;
        if (category === RecommendationCategory.OPPORTUNITY) return Promise.resolve([{ id: 'opp-1' }] as never);
        return Promise.resolve([]);
      });

      await service.orchestrate({ goal: AiOrchestrationGoal.COORDINATED_PLAN }, USER);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        goal: AiOrchestrationGoal.COORDINATED_PLAN,
        status: AiOrchestrationStatus.SUCCESS,
        capabilitiesInvoked: [AiCapability.RECOMMENDATION],
      }));
    });
  });

  describe('orchestrate — failure handling', () => {
    it('records a FAILED run and rethrows when the delegate capability throws', async () => {
      mockRecommendationsService.generate.mockRejectedValue(new Error('AI service down'));

      await expect(service.orchestrate({ goal: AiOrchestrationGoal.OPPORTUNITY_SUGGESTION }, USER)).rejects.toThrow('AI service down');

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        status: AiOrchestrationStatus.FAILED, capabilitiesInvoked: [], outcome: expect.stringContaining('AI service down'),
      }));
    });
  });

  describe('findMine / findAllAdmin', () => {
    it('findMine scopes to the caller', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [makeRun()], total: 1, page: 1, limit: 20 });

      const result = await service.findMine({ page: 1, limit: 20 }, USER);

      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ userId: USER.id }));
      expect(result.data).toHaveLength(1);
    });

    it('findAllAdmin forbids a non-admin caller', async () => {
      await expect(service.findAllAdmin({ page: 1, limit: 20 }, USER)).rejects.toThrow(ForbiddenException);
    });

    it('findAllAdmin lists platform-wide for an admin caller', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [makeRun()], total: 1, page: 1, limit: 20 });

      const result = await service.findAllAdmin({ page: 1, limit: 20 }, ADMIN);

      expect(result.data).toHaveLength(1);
    });
  });

  describe('getRoutingSummary', () => {
    it('forbids a non-admin caller', async () => {
      await expect(service.getRoutingSummary(USER)).rejects.toThrow(ForbiddenException);
    });

    it('returns rolling-24h run counts grouped by goal for an admin caller', async () => {
      mockRepo.countSince.mockResolvedValue(7);
      mockRepo.countByGoalSince.mockResolvedValue([{ goal: AiOrchestrationGoal.OPPORTUNITY_SUGGESTION, count: 7 }]);

      const result = await service.getRoutingSummary(ADMIN);

      expect(result).toEqual({ runsInWindow: 7, runsByGoal: [{ goal: AiOrchestrationGoal.OPPORTUNITY_SUGGESTION, count: 7 }] });
    });
  });
});
