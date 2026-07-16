import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { UsersModule } from '../users/users.module';
import { ProfileModule } from '../users/profile/profile.module';
import { StewardshipModule } from '../stewardship/stewardship.module';
import { CommunicationModule } from '../communication/communication.module';

import { PodsController } from './pods.controller';
import { PodsService } from './pods.service';
import { PrismaPodRepository } from './repositories/prisma-pod.repository';
import { POD_REPOSITORY } from './repositories/pod.repository.interface';

import { PodAuthorizationService } from './common/pod-authorization.service';
import { PodMatchingService } from './matching/pod-matching.service';

import { PodMembershipsController } from './memberships/pod-memberships.controller';
import { PodMembershipsService } from './memberships/pod-memberships.service';
import { PrismaPodMembershipRepository } from './memberships/repositories/prisma-pod-membership.repository';
import { POD_MEMBERSHIP_REPOSITORY } from './memberships/repositories/pod-membership.repository.interface';

import { PodEventsController } from './events/pod-events.controller';
import { PodEventsService } from './events/pod-events.service';
import { PrismaPodEventRepository } from './events/repositories/prisma-pod-event.repository';
import { POD_EVENT_REPOSITORY } from './events/repositories/pod-event.repository.interface';

import { PodMeetingScheduleController } from './meeting-schedule/pod-meeting-schedule.controller';
import { PodMeetingScheduleService } from './meeting-schedule/pod-meeting-schedule.service';
import { PrismaPodMeetingScheduleRepository } from './meeting-schedule/repositories/prisma-pod-meeting-schedule.repository';
import { POD_MEETING_SCHEDULE_REPOSITORY } from './meeting-schedule/repositories/pod-meeting-schedule.repository.interface';

import { PodServiceProjectsController } from './service-projects/pod-service-projects.controller';
import { PodServiceProjectsService } from './service-projects/pod-service-projects.service';
import { PrismaPodServiceProjectRepository } from './service-projects/repositories/prisma-pod-service-project.repository';
import { POD_SERVICE_PROJECT_REPOSITORY } from './service-projects/repositories/pod-service-project.repository.interface';

import { PodRequestsController } from './requests/pod-requests.controller';
import { PodRequestsService } from './requests/pod-requests.service';
import { PrismaPodRequestRepository } from './requests/repositories/prisma-pod-request.repository';
import { POD_REQUEST_REPOSITORY } from './requests/repositories/pod-request.repository.interface';

import { PodInvitationsController } from './invitations/pod-invitations.controller';
import { PodInvitationsService } from './invitations/pod-invitations.service';
import { PrismaPodInvitationRepository } from './invitations/repositories/prisma-pod-invitation.repository';
import { POD_INVITATION_REPOSITORY } from './invitations/repositories/pod-invitation.repository.interface';

import { PodMetricsController } from './metrics/pod-metrics.controller';
import { PodMetricsService } from './metrics/pod-metrics.service';

import { PodEscalationsController } from './escalations/pod-escalations.controller';
import { PodEscalationsService } from './escalations/pod-escalations.service';

import { PodMessagesController } from './messages/pod-messages.controller';
import { PodMessagesService } from './messages/pod-messages.service';

/**
 * Pods (PA-009, WO-030) — the smallest living communities of Aureus.
 * Depends on Stewardship (escalation reuse, §4/§6) and Communication
 * (conversation reuse, §1.6) — one direction only, mirroring every other
 * domain's relationship with those two foundational systems; neither
 * imports Pods back. The AI Intelligence Engine imports PodsModule (not the
 * reverse) for Pod Match Suggestions and Institutional Wisdom (§7),
 * consistent with AiModule's existing position at the top of the module
 * dependency graph (ADR-015 Decision 10).
 */
@Module({
  imports: [
    AuthGuardsModule,
    UsersModule,
    ProfileModule,
    StewardshipModule,
    CommunicationModule,
  ],
  controllers: [
    PodsController,
    PodMembershipsController,
    PodEventsController,
    PodMeetingScheduleController,
    PodServiceProjectsController,
    PodRequestsController,
    PodInvitationsController,
    PodMetricsController,
    PodEscalationsController,
    PodMessagesController,
  ],
  providers: [
    PodAuthorizationService,
    PodMatchingService,

    PodsService,
    { provide: POD_REPOSITORY, useClass: PrismaPodRepository },

    PodMembershipsService,
    { provide: POD_MEMBERSHIP_REPOSITORY, useClass: PrismaPodMembershipRepository },

    PodEventsService,
    { provide: POD_EVENT_REPOSITORY, useClass: PrismaPodEventRepository },

    PodMeetingScheduleService,
    { provide: POD_MEETING_SCHEDULE_REPOSITORY, useClass: PrismaPodMeetingScheduleRepository },

    PodServiceProjectsService,
    { provide: POD_SERVICE_PROJECT_REPOSITORY, useClass: PrismaPodServiceProjectRepository },

    PodRequestsService,
    { provide: POD_REQUEST_REPOSITORY, useClass: PrismaPodRequestRepository },

    PodInvitationsService,
    { provide: POD_INVITATION_REPOSITORY, useClass: PrismaPodInvitationRepository },

    PodMetricsService,
    PodEscalationsService,
    PodMessagesService,
  ],
  exports: [
    PodsService,
    POD_REPOSITORY,
    PodMembershipsService,
    POD_MEMBERSHIP_REPOSITORY,
    PodMatchingService,
    PodMetricsService,
  ],
})
export class PodsModule {}
