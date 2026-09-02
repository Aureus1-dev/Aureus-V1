import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GuidedApplicationSessionStatus, ResponsibilityKind, ResponsibilityStatus, TrackingStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GuidedApplicationService } from '../ai/application-guide/guided-application.service';
import { SavedOpportunitiesService } from '../opportunities/saved/saved-opportunities.service';
import { ResponsibilitiesService } from '../responsibilities/responsibilities.service';
import {
  ActivePeopleApplicationHelpResponseDto,
  CompletePeopleApplicationHelpResponseDto,
  PeopleApplicationHelpResponseDto,
  PausePeopleApplicationHelpResponseDto,
  PeopleApplicationOutcome,
  StartPeopleApplicationHelpDto,
} from './people-help.dto';

@Injectable()
export class PeopleHelpService {
  constructor(
    private readonly responsibilities: ResponsibilitiesService,
    private readonly guidedApplications: GuidedApplicationService,
    private readonly savedOpportunities: SavedOpportunitiesService,
  ) {}

  async start(
    dto: StartPeopleApplicationHelpDto,
    caller: AuthenticatedUser,
  ): Promise<PeopleApplicationHelpResponseDto> {
    // Accept the durable Responsibility before opening the tool-level guide.
    // If a later guide-session operation fails transiently, Aureus does not
    // forget work it already agreed to carry.
    const responsibility =
      await this.responsibilities.acceptApplicationGuidance(dto, caller);

    const session = await this.guidedApplications.startSessionForResponsibility(
      dto,
      caller,
      responsibility.id,
    );

    return { responsibility, session };
  }

  async findActive(
    conversationId: string,
    caller: AuthenticatedUser,
  ): Promise<ActivePeopleApplicationHelpResponseDto | null> {
    const session = await this.guidedApplications.findActive(
      conversationId,
      caller,
    );

    if (session) {
      const responsibility = await this.getBoundResponsibility(
        session,
        caller,
      );

      // A legacy pre-OR-002 guide can still be resumed safely. GET never
      // mutates that legacy session into an implicit Responsibility acceptance.
      return { session, responsibility };
    }

    const responsibility =
      await this.responsibilities.findLatestApplicationGuidanceForConversation(
        conversationId,
        caller,
      );

    return responsibility ? { session: null, responsibility } : null;
  }

  async pause(
    sessionId: string,
    caller: AuthenticatedUser,
  ): Promise<PausePeopleApplicationHelpResponseDto> {
    const session =
      await this.guidedApplications.getOwnedForCoordination(
        sessionId,
        caller,
      );

    const responsibility = await this.getBoundResponsibility(
      session,
      caller,
    );

    // Privacy first: an active tool session is ended/revoked before changing
    // higher-level progress. A retry against an already-ended owned session is
    // a no-op rather than a false 404.
    if (session.status === GuidedApplicationSessionStatus.ACTIVE) {
      await this.guidedApplications.endSession(session.id, caller);
    }

    if (!responsibility) {
      return { paused: true, responsibility: null };
    }

    if (responsibility.status === ResponsibilityStatus.COMPLETED) {
      return { paused: true, responsibility };
    }

    const waiting = await this.responsibilities.pauseApplicationGuidance(
      responsibility.id,
      caller,
    );

    return { paused: true, responsibility: waiting };
  }

  async complete(
    sessionId: string,
    outcome: PeopleApplicationOutcome,
    caller: AuthenticatedUser,
  ): Promise<CompletePeopleApplicationHelpResponseDto> {
    if (
      outcome !== TrackingStatus.APPLIED &&
      outcome !== TrackingStatus.NOT_INTERESTED
    ) {
      throw new ConflictException(
        'Only APPLIED or NOT_INTERESTED can close this bounded application-help Responsibility',
      );
    }

    const session =
      await this.guidedApplications.getOwnedForCoordination(
        sessionId,
        caller,
      );

    const responsibility = await this.getBoundResponsibility(
      session,
      caller,
    );

    if (!responsibility) {
      throw new NotFoundException(
        'Application-help Responsibility not found',
      );
    }

    if (responsibility.status === ResponsibilityStatus.COMPLETED) {
      const completion = [...responsibility.events]
        .reverse()
        .find((event) => event.type === 'COMPLETED');
      if (completion?.sourceState !== outcome) {
        throw new ConflictException(
          'This application-help Responsibility is already complete with a different recorded outcome',
        );
      }
      return {
        responsibility,
        ended: true,
        outcome,
      };
    }

    let saved = await this.savedOpportunities.findOne(
      caller.id,
      session.opportunityId,
    );

    if (!saved) {
      try {
        saved = await this.savedOpportunities.save(caller.id, {
          opportunityId: session.opportunityId,
        });
      } catch {
        // A concurrent save can legitimately win. Re-read to keep the member's
        // explicit outcome operation idempotent instead of surfacing a race.
        saved = await this.savedOpportunities.findOne(
          caller.id,
          session.opportunityId,
        );
      }
    }

    if (!saved) {
      throw new ConflictException(
        'Aureus could not persist the member application outcome',
      );
    }

    const updatedSaved = await this.savedOpportunities.update(
      caller.id,
      session.opportunityId,
      { trackingStatus: outcome },
    );

    // A completed Responsibility must never leave screen-consent authority
    // active, so tool-level guidance is ended before the root is completed.
    if (session.status === GuidedApplicationSessionStatus.ACTIVE) {
      await this.guidedApplications.endSession(session.id, caller);
    }

    const completed =
      await this.responsibilities.completeApplicationGuidance(
        responsibility.id,
        caller,
        updatedSaved.id,
        updatedSaved.trackingStatus,
      );

    return {
      responsibility: completed,
      ended: true,
      outcome,
    };
  }

  private async getBoundResponsibility(
    session: {
      responsibilityId: string | null;
      opportunityId: string;
    },
    caller: AuthenticatedUser,
  ) {
    if (!session.responsibilityId) return null;

    const responsibility = await this.responsibilities.findOne(
      session.responsibilityId,
      caller,
    );

    if (!responsibility) return null;

    if (
      responsibility.kind !==
        ResponsibilityKind.OPPORTUNITY_APPLICATION_GUIDANCE ||
      responsibility.originOpportunityId !== session.opportunityId
    ) {
      throw new ConflictException(
        'Application guidance is not bound to a valid application-help Responsibility',
      );
    }

    return responsibility;
  }
}
