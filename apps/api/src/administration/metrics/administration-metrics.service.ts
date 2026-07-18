import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { StewardshipEscalationStatus, UserRole, UserStatus, VerificationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AiRequestsService } from '../../ai/requests/ai-requests.service';
import { AiOrchestratorService } from '../../ai/orchestrator/ai-orchestrator.service';
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
import { AdministrationMetricsResponseDto } from './dto/administration-metrics-response.dto';

const ADMIN_ROLES = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];
const OPEN_ESCALATION_STATUSES = [StewardshipEscalationStatus.OPEN, StewardshipEscalationStatus.IN_PROGRESS];

/**
 * Institutional health, at a glance (PR-003 Founder Operating System
 * dashboard). A pure aggregator: every count here is computed by a domain's
 * own repository (`findAll({ limit: 1, ... }).total`, or a dedicated count
 * method where one already existed) — this service owns no data and adds no
 * new tables of its own.
 */
@Injectable()
export class AdministrationMetricsService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(RESOURCE_REPOSITORY) private readonly resourceRepo: IResourceRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizationRepo: IOrganizationRepository,
    @Inject(OPPORTUNITY_REPOSITORY) private readonly opportunityRepo: IOpportunityRepository,
    @Inject(KNOWLEDGE_ARTICLE_REPOSITORY) private readonly knowledgeArticleRepo: IKnowledgeArticleRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(STEWARDSHIP_ESCALATION_REPOSITORY) private readonly escalationRepo: IStewardshipEscalationRepository,
    private readonly aiRequestsService: AiRequestsService,
    private readonly aiOrchestratorService: AiOrchestratorService,
    private readonly prisma: PrismaService,
  ) {}

  async getMetrics(caller: AuthenticatedUser): Promise<AdministrationMetricsResponseDto> {
    if (!hasRole(caller, ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may view institutional health metrics');
    }

    const [
      totalUsers,
      usersByRole,
      usersByStatus,
      pendingResources,
      pendingOrganizations,
      pendingOpportunities,
      pendingKnowledgeArticles,
      pendingCourses,
      openEscalations,
      aiSpend,
      aiSpendByCapability,
      orchestrationRoutingSummary,
      databaseHealthy,
    ] = await Promise.all([
      this.userRepo.findAll({ page: 1, limit: 1 }).then((r) => r.total),
      Promise.all(
        Object.values(UserRole).map(async (role) => ({
          role,
          count: (await this.userRepo.findAll({ page: 1, limit: 1, role })).total,
        })),
      ),
      Promise.all(
        Object.values(UserStatus).map(async (status) => ({
          status,
          count: (await this.userRepo.findAll({ page: 1, limit: 1, status })).total,
        })),
      ),
      this.resourceRepo.findAll({ page: 1, limit: 1, verificationStatus: VerificationStatus.PENDING_REVIEW }).then((r) => r.total),
      this.organizationRepo.findAll({ page: 1, limit: 1, verificationStatus: VerificationStatus.PENDING_REVIEW }).then((r) => r.total),
      this.opportunityRepo.findAll({ page: 1, limit: 1, verificationStatus: VerificationStatus.PENDING_REVIEW }).then((r) => r.total),
      this.knowledgeArticleRepo.findAll({ page: 1, limit: 1, verificationStatus: VerificationStatus.PENDING_REVIEW }).then((r) => r.total),
      this.courseRepo.findAll({ page: 1, limit: 1, verificationStatus: VerificationStatus.PENDING_REVIEW }).then((r) => r.total),
      this.escalationRepo.countByStatus(OPEN_ESCALATION_STATUSES),
      this.aiRequestsService.getSpendSummary(caller),
      this.aiRequestsService.getSpendByCapability(caller),
      this.aiOrchestratorService.getRoutingSummary(caller),
      this.isDatabaseHealthy(),
    ]);

    return {
      totalUsers,
      usersByRole,
      usersByStatus,
      pendingVerification: {
        resources: pendingResources,
        organizations: pendingOrganizations,
        opportunities: pendingOpportunities,
        knowledgeArticles: pendingKnowledgeArticles,
        courses: pendingCourses,
        total: pendingResources + pendingOrganizations + pendingOpportunities + pendingKnowledgeArticles + pendingCourses,
      },
      openEscalations,
      aiSpend,
      aiSpendByCapability,
      orchestrationRunsToday: orchestrationRoutingSummary.runsInWindow,
      orchestrationRunsByGoal: orchestrationRoutingSummary.runsByGoal,
      databaseHealthy,
      generatedAt: new Date(),
    };
  }

  private async isDatabaseHealthy(): Promise<boolean> {
    try {
      await this.prisma.db.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
