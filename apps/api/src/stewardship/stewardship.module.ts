import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { UsersModule } from '../users/users.module';
import { ProfileModule } from '../users/profile/profile.module';
import { GoalsModule } from '../goals/goals.module';
import { JourneysModule } from '../journeys/journeys.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { TasksModule } from '../tasks/tasks.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { ResourcesModule } from '../resources/resources.module';
import { ConsentModule } from '../consent/consent.module';

import { StewardshipRelationshipsController } from './relationships/stewardship-relationships.controller';
import { StewardshipRelationshipsService } from './relationships/stewardship-relationships.service';
import { PrismaStewardshipRelationshipRepository } from './relationships/repositories/prisma-stewardship-relationship.repository';
import { STEWARDSHIP_RELATIONSHIP_REPOSITORY } from './relationships/repositories/stewardship-relationship.repository.interface';

import { StewardCapacityController } from './capacity/steward-capacity.controller';
import { StewardCapacityService } from './capacity/steward-capacity.service';
import { PrismaStewardCapacityRepository } from './capacity/repositories/prisma-steward-capacity.repository';
import { STEWARD_CAPACITY_REPOSITORY } from './capacity/repositories/steward-capacity.repository.interface';

import { StewardshipNotesController } from './notes/stewardship-notes.controller';
import { StewardshipNotesService } from './notes/stewardship-notes.service';
import { PrismaStewardshipNoteRepository } from './notes/repositories/prisma-stewardship-note.repository';
import { STEWARDSHIP_NOTE_REPOSITORY } from './notes/repositories/stewardship-note.repository.interface';

import { StewardshipTasksController } from './tasks/stewardship-tasks.controller';
import { StewardshipTasksService } from './tasks/stewardship-tasks.service';
import { PrismaStewardshipTaskRepository } from './tasks/repositories/prisma-stewardship-task.repository';
import { STEWARDSHIP_TASK_REPOSITORY } from './tasks/repositories/stewardship-task.repository.interface';

import { StewardshipRecommendationsController } from './recommendations/stewardship-recommendations.controller';
import { StewardshipRecommendationsService } from './recommendations/stewardship-recommendations.service';
import { PrismaStewardshipRecommendationRepository } from './recommendations/repositories/prisma-stewardship-recommendation.repository';
import { STEWARDSHIP_RECOMMENDATION_REPOSITORY } from './recommendations/repositories/stewardship-recommendation.repository.interface';

import { StewardshipEscalationsController } from './escalations/stewardship-escalations.controller';
import { StewardshipEscalationsService } from './escalations/stewardship-escalations.service';
import { PrismaStewardshipEscalationRepository } from './escalations/repositories/prisma-stewardship-escalation.repository';
import { STEWARDSHIP_ESCALATION_REPOSITORY } from './escalations/repositories/stewardship-escalation.repository.interface';

import { StewardMetricsController } from './metrics/steward-metrics.controller';
import { StewardMetricsService } from './metrics/steward-metrics.service';

@Module({
  imports: [
    AuthGuardsModule,
    UsersModule,
    ProfileModule,
    GoalsModule,
    JourneysModule,
    MilestonesModule,
    TasksModule,
    OrganizationsModule,
    OpportunitiesModule,
    ResourcesModule,
    ConsentModule,
  ],
  controllers: [
    StewardshipRelationshipsController,
    StewardCapacityController,
    StewardshipNotesController,
    StewardshipTasksController,
    StewardshipRecommendationsController,
    StewardshipEscalationsController,
    StewardMetricsController,
  ],
  providers: [
    StewardshipRelationshipsService,
    { provide: STEWARDSHIP_RELATIONSHIP_REPOSITORY, useClass: PrismaStewardshipRelationshipRepository },
    StewardCapacityService,
    { provide: STEWARD_CAPACITY_REPOSITORY, useClass: PrismaStewardCapacityRepository },
    StewardshipNotesService,
    { provide: STEWARDSHIP_NOTE_REPOSITORY, useClass: PrismaStewardshipNoteRepository },
    StewardshipTasksService,
    { provide: STEWARDSHIP_TASK_REPOSITORY, useClass: PrismaStewardshipTaskRepository },
    StewardshipRecommendationsService,
    { provide: STEWARDSHIP_RECOMMENDATION_REPOSITORY, useClass: PrismaStewardshipRecommendationRepository },
    StewardshipEscalationsService,
    { provide: STEWARDSHIP_ESCALATION_REPOSITORY, useClass: PrismaStewardshipEscalationRepository },
    StewardMetricsService,
  ],
  exports: [
    StewardshipRelationshipsService,
    STEWARDSHIP_RELATIONSHIP_REPOSITORY,
    StewardCapacityService,
    // Pods (WO-030) reuses the StewardshipEscalation table directly for Pod
    // escalations (Founder Decision #4) — exported so PodsModule can inject
    // the repository and apply its own Pod-membership-aware authorization,
    // without Stewardship needing to know about Pod roles.
    STEWARDSHIP_ESCALATION_REPOSITORY,
  ],
})
export class StewardshipModule {}
