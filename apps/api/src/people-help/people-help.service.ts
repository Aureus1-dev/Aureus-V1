import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TrackingStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  GuidedApplicationService,
} from '../ai/application-guide/guided-application.service';
import { SavedOpportunitiesService } from '../opportunities/saved/saved-opportunities.service';
import { ResponsibilitiesService } from '../responsibilities/responsibilities.service';
import {
  ActivePeopleApplicationHelpResponseDto,
  PeopleApplicationHelpResponseDto,
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
    // Accepting the Responsibility first is intentional. If a later guide
    // session creation fails because of an internal/transient problem, Aureus
    // must not silently forget the work it already agreed to carry.
    const responsibility =
      await this.responsibilities.acceptApplicationGuidance(dto, caller);

    const session = await this.guidedApplications.startSession(dto, caller);

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
    if (!session) return null;

    const responsibility =
      await this.responsibilities.findOpenApplicationGuidance(
        session.opportunityId,
        caller,
      );

    // A pre-OR-002 legacy guide can still be resumed safely. We do not mutate
    // a GET into an implicit Responsibility acceptance.
    return { session, responsibility };
  }

  async pause(
    sessionId: string,
    caller: AuthenticatedUser,
  ): Promise<{ paused: true; responsibilityId: string | null }> {
    const session =
      await this.guidedApplications.getOwnedActiveForCoordination(
        sessionId,
        caller,
      );

    const responsibility =
      await this.responsibilities.findOpenApplicationGuidance(
        session.opportunityId,
        caller,
      );

    // Privacy first: close the screen-guidance session/revoke consent before
    // changing higher-level progress state.
    await this.guidedApplications.endSession(session.id, caller);

    if (!responsibility) {
      return { paused: true, responsibilityId: null };
    }

    const waiting = await this.responsibilities.pauseApplicationGuidance(
      responsibility.id,
      caller,
    );

    return { paused: true, responsibilityId: waiting.id };
  }

  async complete(
    sessionId: string,
    outcome: PeopleApplicationOutcome,
    caller: AuthenticatedUser,
  ): Promise<PeopleApplicationHelpResponseDto> {
    if (
      outcome !== TrackingStatus.APPLIED &&
      outcome !== TrackingStatus.NOT_INTERESTED
    ) {
      throw new ConflictException(
        'Only APPLIED or NOT_INTERESTED can close this bounded application-help Responsibility',
      );
    }

    const sessionEntity =
      await this.guidedApplications.getOwnedActiveForCoordination(
        sessionId,
        caller,
      );

    const responsibility =
      await this.responsibilities.findOpenApplicationGuidance(
        sessionEntity.opportunityId,
        caller,
      );
    if (!responsibility) {
      throw new NotFoundException(
        'Application-help Responsibility not found',
      );
    }

    let saved = await this.savedOpportunities.findOne(
      caller.id,
      sessionEntity.opportunityId,
    );
    if (!saved) {
      try {
        saved = await this.savedOpportunities.save(caller.id, {
          opportunityId: sessionEntity.opportunityId,
        });
      } catch {
        // A concurrent save may win. Re-read instead of turning an otherwise
        // idempotent member outcome into an avoidable 409/500.
        saved = await this.savedOpportunities.findOne(
          caller.id,
          sessionEntity.opportunityId,
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
      sessionEntity.opportunityId,
      { trackingStatus: outcome },
    );

    // End/revoke guidance before marking the Responsibility complete. A
    // completed Responsibility must never leave screen consent active.
    await this.guidedApplications.endSession(sessionEntity.id, caller);

    const completed =
      await this.responsibilities.completeApplicationGuidance(
        responsibility.id,
        caller,
        updatedSaved.id,
        updatedSaved.trackingStatus,
      );

    // Return the final ended session shape truthfully from the pre-end entity;
    // the client removes the active guide immediately after this response.
    const session = {
      id: sessionEntity.id,
      conversationId: sessionEntity.conversationId,
      opportunityId: sessionEntity.opportunityId,
      opportunityTitle: '',
      provider: '',
      applicationUrl: sessionEntity.applicationUrl,
      status: 'ENDED',
      screenCaptureConsentGrantedAt:
        sessionEntity.screenCaptureConsentGrantedAt,
      screenCaptureConsentRevokedAt: new Date(),
      lastFrameAnalyzedAt: sessionEntity.lastFrameAnalyzedAt,
    };

    return {
      responsibility: completed,
      session: session as PeopleApplicationHelpResponseDto['session'],
    };
  }
}
