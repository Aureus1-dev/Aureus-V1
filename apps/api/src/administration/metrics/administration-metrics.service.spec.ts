import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AiCapability, AiOrchestrationGoal, StewardshipEscalationStatus, UserRole, UserStatus, VerificationStatus } from '@prisma/client';
import { AdministrationMetricsService } from './administration-metrics.service';
import { AiRequestsService } from '../../ai/requests/ai-requests.service';
import { AiOrchestratorService } from '../../ai/orchestrator/ai-orchestrator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { USER_REPOSITORY, IUserRepository } from '../../users/repositories/user.repository.interface';
import { RESOURCE_REPOSITORY, IResourceRepository } from '../../resources/repositories/resource.repository.interface';
import { ORGANIZATION_REPOSITORY, IOrganizationRepository } from '../../organizations/repositories/organization.repository.interface';
import { OPPORTUNITY_REPOSITORY, IOpportunityRepository } from '../../opportunities/repositories/opportunity.repository.interface';
import { KNOWLEDGE_ARTICLE_REPOSITORY, IKnowledgeArticleRepository } from '../../knowledge/repositories/knowledge-article.repository.interface';
import { COURSE_REPOSITORY, ICourseRepository } from '../../academy/courses/repositories/course.repository.interface';
import {
  STEWARDSHIP_ESCALATION_REPOSITORY,
  IStewardshipEscalationRepository,
} from '../../stewardship/escalations/repositories/stewardship-escalation.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };
const MEMBER: AuthenticatedUser = { id: 'user-001', email: 'user@example.com', roles: [UserRole.MEMBER] };

const paginated = (total: number) => ({ data: [], total, page: 1, limit: 1 });

const mockUserRepo: jest.Mocked<IUserRepository> = {
  create: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findAll: jest.fn(),
};
const mockResourceRepo: jest.Mocked<IResourceRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockOrganizationRepo: jest.Mocked<IOrganizationRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockOpportunityRepo: jest.Mocked<IOpportunityRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockKnowledgeArticleRepo: jest.Mocked<IKnowledgeArticleRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockCourseRepo: jest.Mocked<ICourseRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockEscalationRepo: jest.Mocked<IStewardshipEscalationRepository> = {
  create: jest.fn(), findById: jest.fn(), findByRelationship: jest.fn(), findByPod: jest.fn(),
  update: jest.fn(), countByStewardAndStatus: jest.fn(), countByStatus: jest.fn(),
};
const mockAiRequestsService = {
  getSpendSummary: jest.fn(),
  getSpendByCapability: jest.fn(),
} as unknown as jest.Mocked<AiRequestsService>;
const mockAiOrchestratorService = {
  getRoutingSummary: jest.fn(),
} as unknown as jest.Mocked<AiOrchestratorService>;
const mockPrisma = {
  db: { $queryRaw: jest.fn() },
} as unknown as jest.Mocked<PrismaService>;

describe('AdministrationMetricsService', () => {
  let service: AdministrationMetricsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        AdministrationMetricsService,
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: RESOURCE_REPOSITORY, useValue: mockResourceRepo },
        { provide: ORGANIZATION_REPOSITORY, useValue: mockOrganizationRepo },
        { provide: OPPORTUNITY_REPOSITORY, useValue: mockOpportunityRepo },
        { provide: KNOWLEDGE_ARTICLE_REPOSITORY, useValue: mockKnowledgeArticleRepo },
        { provide: COURSE_REPOSITORY, useValue: mockCourseRepo },
        { provide: STEWARDSHIP_ESCALATION_REPOSITORY, useValue: mockEscalationRepo },
        { provide: AiRequestsService, useValue: mockAiRequestsService },
        { provide: AiOrchestratorService, useValue: mockAiOrchestratorService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = m.get(AdministrationMetricsService);
    jest.clearAllMocks();

    mockUserRepo.findAll.mockResolvedValue(paginated(0));
    mockResourceRepo.findAll.mockResolvedValue(paginated(0));
    mockOrganizationRepo.findAll.mockResolvedValue(paginated(0));
    mockOpportunityRepo.findAll.mockResolvedValue(paginated(0));
    mockKnowledgeArticleRepo.findAll.mockResolvedValue(paginated(0));
    mockCourseRepo.findAll.mockResolvedValue(paginated(0));
    mockEscalationRepo.countByStatus.mockResolvedValue(0);
    mockAiRequestsService.getSpendSummary.mockResolvedValue({
      totalCostUsd: 0, requestCount: 0, failedCount: 0, globalDailyBudgetUsd: 50, emergencyStop: false,
    } as never);
    mockAiRequestsService.getSpendByCapability.mockResolvedValue([]);
    mockAiOrchestratorService.getRoutingSummary.mockResolvedValue({ runsInWindow: 0, runsByGoal: [] });
    (mockPrisma.db.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
  });

  it('forbids a non-admin caller', async () => {
    await expect(service.getMetrics(MEMBER)).rejects.toThrow(ForbiddenException);
    expect(mockUserRepo.findAll).not.toHaveBeenCalled();
  });

  it('aggregates every metric for an Administrator', async () => {
    mockUserRepo.findAll.mockImplementation(async ({ role, status }) => {
      if (role === UserRole.MEMBER) return paginated(10);
      if (status === UserStatus.ACTIVE) return paginated(9);
      return paginated(12);
    });
    mockResourceRepo.findAll.mockResolvedValue(paginated(2));
    mockOrganizationRepo.findAll.mockResolvedValue(paginated(1));
    mockOpportunityRepo.findAll.mockResolvedValue(paginated(3));
    mockKnowledgeArticleRepo.findAll.mockResolvedValue(paginated(0));
    mockCourseRepo.findAll.mockResolvedValue(paginated(4));
    mockEscalationRepo.countByStatus.mockResolvedValue(5);
    mockAiRequestsService.getSpendSummary.mockResolvedValue({
      totalCostUsd: 12.5, requestCount: 40, failedCount: 2, globalDailyBudgetUsd: 50, emergencyStop: false,
    } as never);
    mockAiRequestsService.getSpendByCapability.mockResolvedValue([
      { capability: AiCapability.RECOMMENDATION, totalCostUsd: 12.5, requestCount: 40, failedCount: 2 },
    ]);
    mockAiOrchestratorService.getRoutingSummary.mockResolvedValue({
      runsInWindow: 6, runsByGoal: [{ goal: AiOrchestrationGoal.NEXT_BEST_ACTION, count: 6 }],
    });

    const result = await service.getMetrics(ADMIN);

    expect(result.totalUsers).toBe(12);
    expect(result.usersByRole).toContainEqual({ role: UserRole.MEMBER, count: 10 });
    expect(result.usersByStatus).toContainEqual({ status: UserStatus.ACTIVE, count: 9 });
    expect(result.pendingVerification).toEqual({
      resources: 2, organizations: 1, opportunities: 3, knowledgeArticles: 0, courses: 4, total: 10,
    });
    expect(result.openEscalations).toBe(5);
    expect(mockEscalationRepo.countByStatus).toHaveBeenCalledWith([
      StewardshipEscalationStatus.OPEN, StewardshipEscalationStatus.IN_PROGRESS,
    ]);
    expect(result.aiSpend.totalCostUsd).toBe(12.5);
    expect(result.aiSpendByCapability).toEqual([
      { capability: AiCapability.RECOMMENDATION, totalCostUsd: 12.5, requestCount: 40, failedCount: 2 },
    ]);
    expect(result.orchestrationRunsToday).toBe(6);
    expect(result.orchestrationRunsByGoal).toEqual([{ goal: AiOrchestrationGoal.NEXT_BEST_ACTION, count: 6 }]);
    expect(result.databaseHealthy).toBe(true);

    expect(mockResourceRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ verificationStatus: VerificationStatus.PENDING_REVIEW }),
    );
  });

  it('reports databaseHealthy as false when the database is unreachable', async () => {
    (mockPrisma.db.$queryRaw as jest.Mock).mockRejectedValue(new Error('connection refused'));

    const result = await service.getMetrics(ADMIN);

    expect(result.databaseHealthy).toBe(false);
  });
});
