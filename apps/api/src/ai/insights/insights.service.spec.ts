import { Test } from '@nestjs/testing';
import { AiCapability, UserRole } from '@prisma/client';
import { InsightsService } from './insights.service';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { ResourcesService } from '../../resources/resources.service';
import { JourneysService } from '../../journeys/journeys.service';
import { GoalsService } from '../../goals/goals.service';
import { MilestonesService } from '../../milestones/milestones.service';
import { CoursesService } from '../../academy/courses/courses.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { AiRequestsService } from '../requests/ai-requests.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const USER: AuthenticatedUser = { id: 'user-001', email: 'user@example.com', roles: [UserRole.MEMBER] };

const mockOpportunitiesService = { findById: jest.fn() } as unknown as jest.Mocked<OpportunitiesService>;
const mockResourcesService = { findById: jest.fn() } as unknown as jest.Mocked<ResourcesService>;
const mockJourneysService = { findById: jest.fn() } as unknown as jest.Mocked<JourneysService>;
const mockGoalsService = { findById: jest.fn(), findAll: jest.fn() } as unknown as jest.Mocked<GoalsService>;
const mockMilestonesService = { findAll: jest.fn() } as unknown as jest.Mocked<MilestonesService>;
const mockCoursesService = { findById: jest.fn() } as unknown as jest.Mocked<CoursesService>;
const mockKnowledgeService = { findAll: jest.fn() } as unknown as jest.Mocked<KnowledgeService>;
const mockAiRequests = { runCompletion: jest.fn() } as unknown as jest.Mocked<AiRequestsService>;

describe('InsightsService', () => {
  let service: InsightsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        InsightsService,
        { provide: OpportunitiesService, useValue: mockOpportunitiesService },
        { provide: ResourcesService, useValue: mockResourcesService },
        { provide: JourneysService, useValue: mockJourneysService },
        { provide: GoalsService, useValue: mockGoalsService },
        { provide: MilestonesService, useValue: mockMilestonesService },
        { provide: CoursesService, useValue: mockCoursesService },
        { provide: KnowledgeService, useValue: mockKnowledgeService },
        { provide: AiRequestsService, useValue: mockAiRequests },
      ],
    }).compile();
    service = m.get(InsightsService);
    jest.clearAllMocks();
    mockAiRequests.runCompletion.mockResolvedValue({ content: 'AI explanation', requestId: 'req-001' });
  });

  it('explains an Opportunity by fetching it and calling the AI with OPPORTUNITY_EXPLANATION', async () => {
    mockOpportunitiesService.findById.mockResolvedValue({
      title: 'Scholarship', shortDescription: 'x', fullDescription: 'y', benefitType: 'GRANT', eligibilityRules: 'z',
    } as never);

    const result = await service.explainOpportunity('opp-001', USER);

    expect(mockOpportunitiesService.findById).toHaveBeenCalledWith('opp-001');
    expect(mockAiRequests.runCompletion).toHaveBeenCalledWith(expect.objectContaining({ capability: AiCapability.OPPORTUNITY_EXPLANATION }));
    expect(result.content).toBe('AI explanation');
  });

  it('explains a Resource by fetching it and calling the AI with RESOURCE_EXPLANATION', async () => {
    mockResourcesService.findById.mockResolvedValue({
      title: 'Food Bank', shortDescription: 'x', fullDescription: 'y', resourceType: 'SERVICE',
    } as never);

    await service.explainResource('res-001', USER);

    expect(mockAiRequests.runCompletion).toHaveBeenCalledWith(expect.objectContaining({ capability: AiCapability.RESOURCE_EXPLANATION }));
  });

  it('builds Journey guidance from the journey, its goal, and its milestones', async () => {
    mockJourneysService.findById.mockResolvedValue({ goalId: 'goal-001', status: 'ACTIVE' } as never);
    mockGoalsService.findById.mockResolvedValue({ title: 'Save $1000' } as never);
    mockMilestonesService.findAll.mockResolvedValue({ data: [{ title: 'Open savings account', status: 'COMPLETED' }], total: 1, page: 1, limit: 50 } as never);

    await service.journeyGuidance('journey-001', USER);

    expect(mockAiRequests.runCompletion).toHaveBeenCalledWith(expect.objectContaining({ capability: AiCapability.JOURNEY_GUIDANCE }));
  });

  it('builds Academy guidance from the course and the caller\'s own goals', async () => {
    mockCoursesService.findById.mockResolvedValue({ title: 'Budgeting 101', shortDescription: 'x', learningDomain: 'FINANCIAL_LITERACY' } as never);
    mockGoalsService.findAll.mockResolvedValue({ data: [{ title: 'Save $1000' }], total: 1, page: 1, limit: 20 } as never);

    await service.academyGuidance('course-001', USER);

    expect(mockAiRequests.runCompletion).toHaveBeenCalledWith(expect.objectContaining({ capability: AiCapability.ACADEMY_GUIDANCE }));
  });

  it('performs Knowledge search grounded in matching verified articles and returns their sources', async () => {
    mockKnowledgeService.findAll.mockResolvedValue({
      data: [{ id: 'article-001', articleRef: 'AUR-KB-000001', title: 'Requesting a Steward', summary: 'A guide' }],
      total: 1, page: 1, limit: 5,
    } as never);

    const result = await service.knowledgeSearch({ query: 'how do I get a steward' }, USER);

    expect(mockAiRequests.runCompletion).toHaveBeenCalledWith(expect.objectContaining({ capability: AiCapability.KNOWLEDGE_SEARCH }));
    expect(result.sources).toEqual([{ id: 'article-001', articleRef: 'AUR-KB-000001', title: 'Requesting a Steward' }]);
  });
});
