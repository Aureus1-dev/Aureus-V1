import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OpportunityStatus,
  ResponsibilityEvidenceLevel,
  ResponsibilityKind,
  ResponsibilityStatus,
  TrackingStatus,
  VerificationStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ConversationsService } from '../ai/conversations/conversations.service';
import { OpportunitiesService } from '../opportunities/opportunities.service';
import { SavedOpportunitiesService } from '../opportunities/saved/saved-opportunities.service';
import { CreateResponsibilityDto } from './dto/create-responsibility.dto';
import { ResponsibilityResponseDto } from './dto/responsibility-response.dto';
import {
  IResponsibilityRepository,
  RESPONSIBILITY_REPOSITORY,
  ResponsibilityWithEvents,
} from './repositories/responsibility.repository.interface';

const DECISION_STATUSES = new Set<TrackingStatus>([
  TrackingStatus.APPLYING,
  TrackingStatus.APPLIED,
  TrackingStatus.RECEIVED,
  TrackingStatus.NOT_INTERESTED,
]);

@Injectable()
export class ResponsibilitiesService {
  constructor(
    @Inject(RESPONSIBILITY_REPOSITORY)
    private readonly repo: IResponsibilityRepository,
    private readonly conversations: ConversationsService,
    private readonly opportunities: OpportunitiesService,
    private readonly savedOpportunities: SavedOpportunitiesService,
  ) {}

  async accept(
    dto: CreateResponsibilityDto,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    // Validate provenance before looking for a duplicate. This prevents a
    // caller from supplying another member's conversation id and receiving
    // information about an existing Responsibility for the same Opportunity.
    try {
      await this.conversations.findById(dto.conversationId, caller);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw new NotFoundException('Conversation not found');
      }
      throw error;
    }

    const opportunity = await this.opportunities.findById(dto.opportunityId);
    const now = new Date();
    if (
      opportunity.status !== OpportunityStatus.ACTIVE ||
      opportunity.verificationStatus !== VerificationStatus.VERIFIED ||
      opportunity.deletedAt ||
      (opportunity.deadline && opportunity.deadline < now)
    ) {
      throw new ConflictException(
        'This opportunity is not currently verified and actionable',
      );
    }

    const existing = await this.repo.findOpenOpportunityDecision(
      caller.id,
      dto.opportunityId,
    );
    if (existing) return ResponsibilityResponseDto.fromEntity(existing);

    const objective = `Decide the next step for ${opportunity.title}`.slice(0, 2000);
    const responsibility = await this.repo.createAccepted({
      principalUserId: caller.id,
      objective,
      originConversationId: dto.conversationId,
      originOpportunityId: dto.opportunityId,
    });

    return ResponsibilityResponseDto.fromEntity(responsibility);
  }

  async findMine(caller: AuthenticatedUser): Promise<ResponsibilityResponseDto[]> {
    const responsibilities = await this.repo.findPersonalByUser(caller.id);
    return responsibilities.map(ResponsibilityResponseDto.fromEntity);
  }

  async findOne(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    const responsibility = await this.getOwnedOrThrow(id, caller.id);
    return ResponsibilityResponseDto.fromEntity(responsibility);
  }

  async reconcile(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    const current = await this.getOwnedOrThrow(id, caller.id);

    if (current.status === ResponsibilityStatus.COMPLETED) {
      return ResponsibilityResponseDto.fromEntity(current);
    }
    if (
      current.status === ResponsibilityStatus.CANCELLED ||
      current.status === ResponsibilityStatus.RESPONSIBLY_EXHAUSTED
    ) {
      throw new ConflictException(
        `Responsibility is already terminal in ${current.status} state`,
      );
    }
    if (
      current.kind !== ResponsibilityKind.OPPORTUNITY_DECISION ||
      !current.originOpportunityId
    ) {
      throw new ConflictException(
        'This Responsibility does not have an OR-001 reconciliation policy',
      );
    }

    const saved = await this.savedOpportunities.findOne(
      caller.id,
      current.originOpportunityId,
    );

    if (!saved || saved.trackingStatus === TrackingStatus.SAVED) {
      if (current.status === ResponsibilityStatus.WAITING_ON_USER) {
        return ResponsibilityResponseDto.fromEntity(current);
      }
      if (current.status !== ResponsibilityStatus.ACTIVE) {
        throw new ConflictException(
          `Responsibility cannot request user input from ${current.status} state`,
        );
      }
      const waiting = await this.repo.markWaitingOnUser(id, caller.id);
      return ResponsibilityResponseDto.fromEntity(waiting);
    }

    if (!DECISION_STATUSES.has(saved.trackingStatus)) {
      throw new ConflictException(
        'Saved opportunity state is not sufficient to complete this Responsibility',
      );
    }

    if (
      current.status !== ResponsibilityStatus.ACTIVE &&
      current.status !== ResponsibilityStatus.WAITING_ON_USER
    ) {
      throw new ConflictException(
        `Responsibility cannot complete from ${current.status} state`,
      );
    }

    const completed = await this.repo.completeWithEvidence(id, caller.id, {
      sourceSystem: 'OPPORTUNITY_ENGINE',
      sourceRecordType: 'SavedOpportunity',
      sourceRecordId: saved.id,
      sourceState: saved.trackingStatus,
      // SavedOpportunity.trackingStatus is member-managed. It is valid
      // evidence of the member's decision state, but not independent proof
      // that an external institution awarded/approved anything.
      evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
    });

    return ResponsibilityResponseDto.fromEntity(completed);
  }

  private async getOwnedOrThrow(
    id: string,
    principalUserId: string,
  ): Promise<ResponsibilityWithEvents> {
    const responsibility = await this.repo.findPersonalById(id, principalUserId);
    if (!responsibility) throw new NotFoundException('Responsibility not found');
    return responsibility;
  }
}
