import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OpportunityStatus,
  Prisma,
  ResponsibilityEvidenceLevel,
  ResponsibilityKind,
  ResponsibilityStatus,
  TrackingStatus,
  VerificationStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ConversationsService } from '../ai/conversations/conversations.service';
import { OpportunityLinkRegistryService } from '../opportunities/opportunity-link-registry.service';
import { OpportunitiesService } from '../opportunities/opportunities.service';
import { SavedOpportunitiesService } from '../opportunities/saved/saved-opportunities.service';
import { CreateResponsibilityDto } from './dto/create-responsibility.dto';
import { ResponsibilityResponseDto } from './dto/responsibility-response.dto';
import {
  IResponsibilityRepository,
  RESPONSIBILITY_REPOSITORY,
  ResponsibilityEvidenceInput,
  ResponsibilityWithEvents,
} from './repositories/responsibility.repository.interface';

const DECISION_STATUSES = new Set<TrackingStatus>([
  TrackingStatus.APPLYING,
  TrackingStatus.APPLIED,
  TrackingStatus.RECEIVED,
  TrackingStatus.NOT_INTERESTED,
]);

const APPLICATION_TERMINAL_STATUSES = new Set<TrackingStatus>([
  TrackingStatus.APPLIED,
  TrackingStatus.NOT_INTERESTED,
]);

const OPPORTUNITY_DECISION_CRITERIA = {
  type: 'OPPORTUNITY_DECISION_RECORDED',
  evidenceSource: 'SavedOpportunity.trackingStatus',
  terminalTrackingStatuses: [
    TrackingStatus.APPLYING,
    TrackingStatus.APPLIED,
    TrackingStatus.RECEIVED,
    TrackingStatus.NOT_INTERESTED,
  ],
};

const APPLICATION_GUIDANCE_CRITERIA = {
  type: 'APPLICATION_GUIDANCE_MEMBER_OUTCOME_RECORDED',
  evidenceSource: 'SavedOpportunity.trackingStatus',
  terminalTrackingStatuses: [
    TrackingStatus.APPLIED,
    TrackingStatus.NOT_INTERESTED,
  ],
  evidenceMeaning:
    'Member-reported application outcome. Does not prove third-party approval, award, or receipt.',
};

@Injectable()
export class ResponsibilitiesService {
  constructor(
    @Inject(RESPONSIBILITY_REPOSITORY)
    private readonly repo: IResponsibilityRepository,
    private readonly conversations: ConversationsService,
    private readonly opportunities: OpportunitiesService,
    private readonly savedOpportunities: SavedOpportunitiesService,
    private readonly opportunityLinks: OpportunityLinkRegistryService,
  ) {}

  async accept(
    dto: CreateResponsibilityDto,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    const opportunity = await this.validateOwnedConversationAndOpportunity(dto, caller);

    const existing = await this.repo.findOpenOpportunityResponsibility(
      caller.id,
      dto.opportunityId,
      ResponsibilityKind.OPPORTUNITY_DECISION,
    );
    if (existing) return ResponsibilityResponseDto.fromEntity(existing);

    const objective = `Decide the next step for ${opportunity.title}`.slice(0, 2000);
    const responsibility = await this.repo.createAccepted({
      principalUserId: caller.id,
      kind: ResponsibilityKind.OPPORTUNITY_DECISION,
      objective,
      originConversationId: dto.conversationId,
      originOpportunityId: dto.opportunityId,
      successCriteria: OPPORTUNITY_DECISION_CRITERIA,
    });

    return ResponsibilityResponseDto.fromEntity(responsibility);
  }

  /**
   * OR-002 internal acceptance path. The caller action means “help me work
   * through this application,” so the Responsibility is durable before the
   * member begins screen guidance. Authority remains GUIDANCE_ONLY.
   */
  async acceptApplicationGuidance(
    dto: CreateResponsibilityDto,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    const opportunity = await this.validateOwnedConversationAndOpportunity(dto, caller);

    const registryEntry = this.opportunityLinks.toRegistryEntry(opportunity);
    if (registryEntry.status !== 'verified') {
      throw new ConflictException(
        'This opportunity no longer has a currently verified application destination',
      );
    }
    let applicationUrl: URL;
    try {
      applicationUrl = new URL(registryEntry.canonicalUrl);
    } catch {
      throw new ConflictException(
        'This opportunity does not have a valid verified application destination',
      );
    }
    if (applicationUrl.protocol !== 'https:') {
      throw new ConflictException(
        'Application guidance requires an HTTPS verified destination',
      );
    }

    const existing = await this.repo.findOpenOpportunityResponsibility(
      caller.id,
      dto.opportunityId,
      ResponsibilityKind.OPPORTUNITY_APPLICATION_GUIDANCE,
    );
    if (existing) {
      const resumed = await this.repo.resumeFromWaitingOnUser(existing.id, caller.id);
      return ResponsibilityResponseDto.fromEntity(resumed);
    }

    const objective = `Help me work through the verified application for ${opportunity.title}`.slice(
      0,
      2000,
    );
    const responsibility = await this.repo.createAccepted({
      principalUserId: caller.id,
      kind: ResponsibilityKind.OPPORTUNITY_APPLICATION_GUIDANCE,
      objective,
      originConversationId: dto.conversationId,
      originOpportunityId: dto.opportunityId,
      successCriteria: APPLICATION_GUIDANCE_CRITERIA,
    });

    return ResponsibilityResponseDto.fromEntity(responsibility);
  }

  /**
   * OR-004 acceptance boundary. People Resolution owns StatedNeed validation;
   * Responsibility independently re-validates the owned conversation before
   * recording Aureus's durable commitment. Client input cannot choose
   * principal/context/privacy/authority/evidence.
   */
  async acceptPersonalNeedResolution(
    input: {
      conversationId: string;
      objective: string;
      successCriteria: Prisma.InputJsonValue;
      dueAt?: Date | null;
    },
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    await this.validateOwnedConversation(input.conversationId, caller);

    const requestedCriteria = input.successCriteria as { statedNeedId?: unknown };
    const requestedNeedId =
      typeof requestedCriteria?.statedNeedId === 'string'
        ? requestedCriteria.statedNeedId
        : null;
    if (!requestedNeedId) {
      throw new ConflictException(
        'Personal Need Responsibility requires canonical StatedNeed provenance',
      );
    }

    const latest = await this.repo.findLatestPersonalByConversationKind(
      caller.id,
      input.conversationId,
      ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
    );
    if (latest) {
      const latestCriteria = latest.successCriteria as { statedNeedId?: unknown } | null;
      const latestNeedId =
        latestCriteria && typeof latestCriteria.statedNeedId === 'string'
          ? latestCriteria.statedNeedId
          : null;

      // Same canonical need stays the same promise even after terminal state.
      // POST retries therefore return terminal truth instead of reopening work.
      if (latestNeedId === requestedNeedId) {
        return ResponsibilityResponseDto.fromEntity(latest);
      }

      const terminal =
        latest.status === ResponsibilityStatus.COMPLETED ||
        latest.status === ResponsibilityStatus.RESPONSIBLY_EXHAUSTED ||
        latest.status === ResponsibilityStatus.CANCELLED;
      if (!terminal) {
        throw new ConflictException(
          'This conversation already has an open Personal Need Responsibility for different StatedNeed provenance',
        );
      }
    }

    const responsibility = await this.repo.createAccepted({
      principalUserId: caller.id,
      kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
      objective: input.objective.slice(0, 2000),
      originConversationId: input.conversationId,
      originOpportunityId: null,
      successCriteria: input.successCriteria,
      dueAt: input.dueAt ?? null,
    });

    // If a concurrent request for different provenance won the database race,
    // never return its Responsibility as though it belonged to this request.
    const persistedCriteria = responsibility.successCriteria as {
      statedNeedId?: unknown;
    } | null;
    if (persistedCriteria?.statedNeedId !== requestedNeedId) {
      throw new ConflictException(
        'Personal Need Responsibility provenance changed during concurrent acceptance',
      );
    }

    return ResponsibilityResponseDto.fromEntity(responsibility);
  }

  async findOwnedPersonalNeedResolution(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    const current = await this.getOwnedPersonalNeedOrThrow(id, caller.id);
    return ResponsibilityResponseDto.fromEntity(current);
  }

  async markPersonalNeedWaitingOnUser(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    await this.getOwnedPersonalNeedOrThrow(id, caller.id);
    const current = await this.repo.markWaitingOnUser(id, caller.id);
    return ResponsibilityResponseDto.fromEntity(current);
  }

  async markPersonalNeedWaitingOnThirdParty(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    await this.getOwnedPersonalNeedOrThrow(id, caller.id);
    const current = await this.repo.markWaitingOnThirdParty(id, caller.id);
    return ResponsibilityResponseDto.fromEntity(current);
  }

  /**
   * OR-004 continuation boundary. A member action can satisfy the reason we
   * were waiting on the member even when no external route is presently
   * available. In that case Aureus retains ownership instead of leaving the
   * Responsibility falsely WAITING_ON_USER or terminally exhausting it.
   */
  async resumePersonalNeedForAureus(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    await this.getOwnedPersonalNeedOrThrow(id, caller.id);
    const current = await this.repo.resumeFromWaitingOnUser(id, caller.id);
    return ResponsibilityResponseDto.fromEntity(current);
  }

  async completePersonalNeedWithEvidence(
    id: string,
    caller: AuthenticatedUser,
    evidence: ResponsibilityEvidenceInput,
  ): Promise<ResponsibilityResponseDto> {
    await this.getOwnedPersonalNeedOrThrow(id, caller.id);
    const current = await this.repo.completeWithEvidence(id, caller.id, evidence);
    return ResponsibilityResponseDto.fromEntity(current);
  }

  async exhaustPersonalNeedWithEvidence(
    id: string,
    caller: AuthenticatedUser,
    evidence: ResponsibilityEvidenceInput,
  ): Promise<ResponsibilityResponseDto> {
    await this.getOwnedPersonalNeedOrThrow(id, caller.id);
    const current = await this.repo.responsiblyExhaustWithEvidence(
      id,
      caller.id,
      evidence,
    );
    return ResponsibilityResponseDto.fromEntity(current);
  }

  async findLatestApplicationGuidanceForConversation(
    conversationId: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto | null> {
    const current = await this.repo.findLatestPersonalByConversationKind(
      caller.id,
      conversationId,
      ResponsibilityKind.OPPORTUNITY_APPLICATION_GUIDANCE,
    );
    return current ? ResponsibilityResponseDto.fromEntity(current) : null;
  }

  async findOpenApplicationGuidance(
    opportunityId: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto | null> {
    const current = await this.repo.findOpenOpportunityResponsibility(
      caller.id,
      opportunityId,
      ResponsibilityKind.OPPORTUNITY_APPLICATION_GUIDANCE,
    );
    return current ? ResponsibilityResponseDto.fromEntity(current) : null;
  }

  async pauseApplicationGuidance(
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    const current = await this.getOwnedApplicationGuidanceOrThrow(
      responsibilityId,
      caller.id,
    );
    if (current.status === ResponsibilityStatus.COMPLETED) {
      return ResponsibilityResponseDto.fromEntity(current);
    }
    const waiting = await this.repo.markWaitingOnUser(current.id, caller.id);
    return ResponsibilityResponseDto.fromEntity(waiting);
  }

  async completeApplicationGuidance(
    responsibilityId: string,
    caller: AuthenticatedUser,
    savedOpportunityId: string,
    trackingStatus: TrackingStatus,
  ): Promise<ResponsibilityResponseDto> {
    if (!APPLICATION_TERMINAL_STATUSES.has(trackingStatus)) {
      throw new ConflictException(
        'This application outcome is not sufficient to complete application guidance',
      );
    }

    const current = await this.getOwnedApplicationGuidanceOrThrow(
      responsibilityId,
      caller.id,
    );
    if (current.status === ResponsibilityStatus.COMPLETED) {
      return ResponsibilityResponseDto.fromEntity(current);
    }

    const completed = await this.repo.completeWithEvidence(
      current.id,
      caller.id,
      {
        sourceSystem: 'OPPORTUNITY_ENGINE',
        sourceRecordType: 'SavedOpportunity',
        sourceRecordId: savedOpportunityId,
        sourceState: trackingStatus,
        evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
      },
    );

    return ResponsibilityResponseDto.fromEntity(completed);
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
      evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
    });

    return ResponsibilityResponseDto.fromEntity(completed);
  }

  private async validateOwnedConversationAndOpportunity(
    dto: CreateResponsibilityDto,
    caller: AuthenticatedUser,
  ) {
    await this.validateOwnedConversation(dto.conversationId, caller);

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
    return opportunity;
  }

  private async validateOwnedConversation(
    conversationId: string,
    caller: AuthenticatedUser,
  ): Promise<void> {
    // Validate provenance first so duplicate lookup never becomes a side
    // channel for another member's conversation.
    try {
      await this.conversations.findById(conversationId, caller);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw new NotFoundException('Conversation not found');
      }
      throw error;
    }
  }

  private async getOwnedApplicationGuidanceOrThrow(
    id: string,
    principalUserId: string,
  ): Promise<ResponsibilityWithEvents> {
    const responsibility = await this.getOwnedOrThrow(id, principalUserId);
    if (
      responsibility.kind !==
      ResponsibilityKind.OPPORTUNITY_APPLICATION_GUIDANCE
    ) {
      throw new NotFoundException('Application-help Responsibility not found');
    }
    return responsibility;
  }

  private async getOwnedPersonalNeedOrThrow(
    id: string,
    principalUserId: string,
  ): Promise<ResponsibilityWithEvents> {
    const responsibility = await this.getOwnedOrThrow(id, principalUserId);
    if (responsibility.kind !== ResponsibilityKind.PERSONAL_NEED_RESOLUTION) {
      throw new NotFoundException('Personal-need Responsibility not found');
    }
    return responsibility;
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
