import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { GoalStatus, MilestoneStatus, StewardshipEscalationStatus, StewardshipRelationshipStatus, StewardshipTaskStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/stewardship-roles.util';
import { StewardMetricsResponseDto } from './dto/steward-metrics-response.dto';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../relationships/repositories/stewardship-relationship.repository.interface';
import { IStewardCapacityRepository, STEWARD_CAPACITY_REPOSITORY } from '../capacity/repositories/steward-capacity.repository.interface';
import { IStewardshipTaskRepository, STEWARDSHIP_TASK_REPOSITORY } from '../tasks/repositories/stewardship-task.repository.interface';
import {
  IStewardshipEscalationRepository,
  STEWARDSHIP_ESCALATION_REPOSITORY,
} from '../escalations/repositories/stewardship-escalation.repository.interface';
import { IGoalRepository, GOAL_REPOSITORY } from '../../goals/repositories/goal.repository.interface';
import { IJourneyRepository, JOURNEY_REPOSITORY } from '../../journeys/repositories/journey.repository.interface';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from '../../milestones/repositories/milestone.repository.interface';

@Injectable()
export class StewardMetricsService {
  constructor(
    @Inject(STEWARDSHIP_RELATIONSHIP_REPOSITORY) private readonly relationshipRepo: IStewardshipRelationshipRepository,
    @Inject(STEWARD_CAPACITY_REPOSITORY) private readonly capacityRepo: IStewardCapacityRepository,
    @Inject(STEWARDSHIP_TASK_REPOSITORY) private readonly taskRepo: IStewardshipTaskRepository,
    @Inject(STEWARDSHIP_ESCALATION_REPOSITORY) private readonly escalationRepo: IStewardshipEscalationRepository,
    @Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository,
    @Inject(JOURNEY_REPOSITORY) private readonly journeyRepo: IJourneyRepository,
    @Inject(MILESTONE_REPOSITORY) private readonly milestoneRepo: IMilestoneRepository,
  ) {}

  async getForSteward(stewardId: string, caller: AuthenticatedUser): Promise<StewardMetricsResponseDto> {
    if (caller.id !== stewardId && !hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('You may only view your own metrics');
    }

    const [activeCount, capacity, tasksCompleted, escalationsResolved, activeRelationships] = await Promise.all([
      this.relationshipRepo.countActiveByStewardId(stewardId),
      this.capacityRepo.findOrCreate(stewardId, stewardId),
      this.taskRepo.countByStewardAndStatus(stewardId, StewardshipTaskStatus.COMPLETED),
      this.escalationRepo.countByStewardAndStatus(stewardId, [StewardshipEscalationStatus.RESOLVED, StewardshipEscalationStatus.CLOSED]),
      this.relationshipRepo.findAll({ page: 1, limit: 100, stewardId, status: StewardshipRelationshipStatus.ACTIVE }),
    ]);

    const memberIds = activeRelationships.data.map((r) => r.memberId);
    const { completionRate, journeyProgress } = await this.computeProgress(memberIds);

    return {
      stewardId,
      activeMemberCount: activeCount,
      capacity: capacity.maxActiveMembers,
      tasksCompleted,
      escalationsResolved,
      memberGoalCompletionRate: completionRate,
      averageJourneyProgress: journeyProgress,
      averageResponseTimeHours: null,
      memberSatisfactionScore: null,
      generatedAt: new Date(),
    };
  }

  private async computeProgress(
    memberIds: string[],
  ): Promise<{ completionRate: number | null; journeyProgress: number | null }> {
    if (memberIds.length === 0) return { completionRate: null, journeyProgress: null };

    const goalLists = await Promise.all(
      memberIds.map((userId) => this.goalRepo.findAll({ page: 1, limit: 100, userId })),
    );
    const goals = goalLists.flatMap((r) => r.data);

    let completionRate: number | null = null;
    if (goals.length > 0) {
      const completed = goals.filter((g) => g.status === GoalStatus.COMPLETED).length;
      completionRate = Math.round((completed / goals.length) * 100);
    }

    const journeys = (
      await Promise.all(goals.map((g) => this.journeyRepo.findByGoalId(g.id)))
    ).filter((j): j is NonNullable<typeof j> => j !== null);

    let journeyProgress: number | null = null;
    if (journeys.length > 0) {
      const perJourneyPercents = await Promise.all(
        journeys.map(async (j) => {
          const { data: milestones } = await this.milestoneRepo.findAll({ page: 1, limit: 100, journeyId: j.id });
          if (milestones.length === 0) return null;
          const completed = milestones.filter((m) => m.status === MilestoneStatus.COMPLETED).length;
          return (completed / milestones.length) * 100;
        }),
      );
      const valid = perJourneyPercents.filter((p): p is number => p !== null);
      if (valid.length > 0) {
        journeyProgress = Math.round(valid.reduce((sum, p) => sum + p, 0) / valid.length);
      }
    }

    return { completionRate, journeyProgress };
  }
}
