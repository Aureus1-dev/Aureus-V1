import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NeedEscalationStatus,
  ResourceOfferResponse,
  ResponsibilityEvidenceLevel,
  ResponsibilityStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MatchedResourceDto } from '../needs/dto/matched-resource.dto';
import { StatedNeedResponseDto } from '../needs/dto/stated-need-response.dto';
import { NeedEscalationsService } from '../needs/need-escalations.service';
import { NeedsService } from '../needs/needs.service';
import { matchCategoriesForNeed } from '../needs/resource-matching.util';
import { ResponsibilityResponseDto } from '../responsibilities/dto/responsibility-response.dto';
import { ResponsibilitiesService } from '../responsibilities/responsibilities.service';
import {
  AcceptPersonalResolutionDto,
  PersonalResolutionRouteKind,
  PersonalResolutionStateDto,
  RequestHumanStewardDto,
  RespondToResolutionResourceDto,
} from './people-resolutions.dto';

const TERMINAL_STATUSES = new Set<ResponsibilityStatus>([
  ResponsibilityStatus.COMPLETED,
  ResponsibilityStatus.RESPONSIBLY_EXHAUSTED,
  ResponsibilityStatus.CANCELLED,
]);

@Injectable()
export class PeopleResolutionsService {
  constructor(
    private readonly responsibilities: ResponsibilitiesService,
    private readonly needs: NeedsService,
    private readonly escalations: NeedEscalationsService,
  ) {}

  async accept(
    dto: AcceptPersonalResolutionDto,
    caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    const need = await this.getOwnedNeed(dto.statedNeedId, caller.id);
    const objective = dto.objective.trim();

    const responsibility = await this.responsibilities.acceptPersonalNeedResolution(
      {
        conversationId: need.conversationId,
        objective,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          statedNeedId: need.id,
          completionRule: 'SOURCE_DOMAIN_OUTCOME_EVIDENCE_REQUIRED',
          nonCompletionStates: ['RESOURCE_OFFERED', 'RESOURCE_ACCEPTED', 'HUMAN_ESCALATION_OPEN'],
          evidenceMeaning:
            'A resource offer, acceptance, or handoff does not by itself prove the member need was resolved.',
        },
      },
      caller,
    );

    return this.continue(responsibility.id, caller);
  }

  async findOne(
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    const responsibility = await this.responsibilities.findOwnedPersonalNeedResolution(
      responsibilityId,
      caller,
    );
    const need = await this.getNeedForResponsibility(responsibility, caller.id);
    return this.project(responsibility, need, caller);
  }

  async continue(
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    let responsibility = await this.responsibilities.findOwnedPersonalNeedResolution(
      responsibilityId,
      caller,
    );
    const need = await this.getNeedForResponsibility(responsibility, caller.id);

    if (TERMINAL_STATUSES.has(responsibility.status)) {
      return this.project(responsibility, need, caller);
    }

    const escalationRows = await this.escalations.findEscalations(need.id, caller.id);
    const resolvedEscalation = escalationRows.find(
      (row) => row.status === NeedEscalationStatus.RESOLVED,
    );
    if (resolvedEscalation) {
      responsibility = await this.responsibilities.completePersonalNeedWithEvidence(
        responsibility.id,
        caller,
        {
          sourceSystem: 'NEEDS',
          sourceRecordType: 'NeedEscalation',
          sourceRecordId: resolvedEscalation.id,
          sourceState: NeedEscalationStatus.RESOLVED,
          evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
        },
      );
      return this.project(responsibility, need, caller);
    }

    const openEscalation = escalationRows.find(
      (row) =>
        row.status === NeedEscalationStatus.PENDING ||
        row.status === NeedEscalationStatus.ACKNOWLEDGED,
    );
    if (openEscalation) {
      responsibility = await this.responsibilities.markPersonalNeedWaitingOnThirdParty(
        responsibility.id,
        caller,
      );
      return this.project(responsibility, need, caller);
    }

    const [offers, matchingResources] = await Promise.all([
      this.needs.findOffers(need.id, caller.id),
      this.needs.findMatchingResources(need.id, caller.id),
    ]);

    const acceptedOffer = offers.find(
      (offer) => offer.response === ResourceOfferResponse.ACCEPTED,
    );
    if (acceptedOffer) {
      responsibility = await this.responsibilities.markPersonalNeedWaitingOnThirdParty(
        responsibility.id,
        caller,
      );
      return this.projectWithKnownSources(
        responsibility,
        need,
        matchingResources,
        acceptedOffer.citySheetEntryId,
        PersonalResolutionRouteKind.VERIFIED_RESOURCE,
        'A resource you accepted is in progress. Aureus has not recorded proof that the underlying need is resolved yet.',
        false,
      );
    }

    const currentlySafeIds = new Set(matchingResources.map((resource) => resource.id));
    const pendingOffer = offers.find(
      (offer) =>
        offer.response === ResourceOfferResponse.PENDING &&
        currentlySafeIds.has(offer.citySheetEntryId),
    );
    if (pendingOffer) {
      responsibility = await this.responsibilities.markPersonalNeedWaitingOnUser(
        responsibility.id,
        caller,
      );
      return this.projectWithKnownSources(
        responsibility,
        need,
        matchingResources,
        pendingOffer.citySheetEntryId,
        PersonalResolutionRouteKind.VERIFIED_RESOURCE,
        'Review this verified resource route and tell Aureus whether you want to use it.',
        true,
      );
    }

    const previouslyOffered = new Set(offers.map((offer) => offer.citySheetEntryId));
    const nextResource = [...matchingResources]
      .sort((a, b) => (a.citySheetRef ?? a.id).localeCompare(b.citySheetRef ?? b.id))
      .find((resource) => !previouslyOffered.has(resource.id));

    if (nextResource) {
      await this.needs.offerResource(need.id, nextResource.id, caller.id);
      responsibility = await this.responsibilities.markPersonalNeedWaitingOnUser(
        responsibility.id,
        caller,
      );
      return this.projectWithKnownSources(
        responsibility,
        need,
        matchingResources,
        nextResource.id,
        PersonalResolutionRouteKind.VERIFIED_RESOURCE,
        'Aureus found a verified route. Review it and tell Aureus whether you want to use it.',
        true,
      );
    }

    const recognizedCategories = matchCategoriesForNeed(need.content);
    if (recognizedCategories.length === 0) {
      responsibility = await this.responsibilities.markPersonalNeedWaitingOnUser(
        responsibility.id,
        caller,
      );
      return this.projectWithKnownSources(
        responsibility,
        need,
        matchingResources,
        null,
        PersonalResolutionRouteKind.CLARIFICATION,
        'Aureus needs one more detail about the need before choosing a responsible route.',
        true,
      );
    }

    // No currently verified resource exists at all. Reuse Gate C's durable
    // safe-failure record, which independently checks human reachability.
    if (matchingResources.length === 0) {
      const safeFailure = await this.needs.checkSafeFailure(need.id, caller.id);
      if (safeFailure.triggered && safeFailure.recordId) {
        responsibility = await this.responsibilities.exhaustPersonalNeedWithEvidence(
          responsibility.id,
          caller,
          {
            sourceSystem: 'NEEDS',
            sourceRecordType: 'UnresolvedNeed',
            sourceRecordId: safeFailure.recordId,
            sourceState: safeFailure.reason ?? 'NO_CURRENT_SAFE_ROUTE',
            evidenceLevel: ResponsibilityEvidenceLevel.VERIFIED,
          },
        );
        return this.projectWithKnownSources(
          responsibility,
          need,
          matchingResources,
          null,
          PersonalResolutionRouteKind.NONE,
          safeFailure.nextStep,
          false,
        );
      }

      responsibility = await this.responsibilities.markPersonalNeedWaitingOnUser(
        responsibility.id,
        caller,
      );
      return this.projectWithKnownSources(
        responsibility,
        need,
        matchingResources,
        null,
        PersonalResolutionRouteKind.HUMAN_STEWARD,
        'No verified resource route is available right now. You can ask Aureus to bring in a Human Steward.',
        true,
      );
    }

    // Verified resources still exist, but every current one was already
    // offered and neither accepted nor pending; therefore the member declined
    // the current verified set. This is different from "no resource exists."
    const humanReachable = await this.needs.isHumanStewardReachable();
    if (humanReachable) {
      responsibility = await this.responsibilities.markPersonalNeedWaitingOnUser(
        responsibility.id,
        caller,
      );
      return this.projectWithKnownSources(
        responsibility,
        need,
        matchingResources,
        null,
        PersonalResolutionRouteKind.HUMAN_STEWARD,
        'You declined the current verified resource routes. A Human Steward is reachable if you want Aureus to bring one in.',
        true,
      );
    }

    const declinedCurrentOffer = offers.find(
      (offer) =>
        offer.response === ResourceOfferResponse.DECLINED &&
        currentlySafeIds.has(offer.citySheetEntryId),
    );
    if (declinedCurrentOffer) {
      responsibility = await this.responsibilities.exhaustPersonalNeedWithEvidence(
        responsibility.id,
        caller,
        {
          sourceSystem: 'NEEDS',
          sourceRecordType: 'ResourceOffer',
          sourceRecordId: declinedCurrentOffer.id,
          sourceState: 'ALL_CURRENT_VERIFIED_ROUTES_DECLINED_NO_STEWARD_REACHABLE',
          evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
        },
      );
      return this.projectWithKnownSources(
        responsibility,
        need,
        matchingResources,
        null,
        PersonalResolutionRouteKind.NONE,
        'The current verified routes were declined and no Human Steward is reachable right now. Aureus has preserved the need and the evidence instead of pretending it was resolved.',
        false,
      );
    }

    // Defensive fail-closed path for an inconsistent source projection.
    responsibility = await this.responsibilities.markPersonalNeedWaitingOnUser(
      responsibility.id,
      caller,
    );
    return this.projectWithKnownSources(
      responsibility,
      need,
      matchingResources,
      null,
      PersonalResolutionRouteKind.CLARIFICATION,
      'Aureus cannot safely determine the next route from the current records. Review the need before continuing.',
      true,
    );
  }

  async respondToResource(
    responsibilityId: string,
    dto: RespondToResolutionResourceDto,
    caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    const responsibility = await this.responsibilities.findOwnedPersonalNeedResolution(
      responsibilityId,
      caller,
    );
    const need = await this.getNeedForResponsibility(responsibility, caller.id);

    if (TERMINAL_STATUSES.has(responsibility.status)) {
      return this.project(responsibility, need, caller);
    }

    await this.needs.respondToOffer(
      need.id,
      dto.citySheetEntryId,
      dto.accepted,
      caller.id,
    );

    if (dto.accepted) {
      const waiting = await this.responsibilities.markPersonalNeedWaitingOnThirdParty(
        responsibility.id,
        caller,
      );
      return this.project(waiting, need, caller);
    }

    return this.continue(responsibility.id, caller);
  }

  async requestHumanSteward(
    responsibilityId: string,
    dto: RequestHumanStewardDto,
    caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    let responsibility = await this.responsibilities.findOwnedPersonalNeedResolution(
      responsibilityId,
      caller,
    );
    const need = await this.getNeedForResponsibility(responsibility, caller.id);

    if (TERMINAL_STATUSES.has(responsibility.status)) {
      return this.project(responsibility, need, caller);
    }

    const rows = await this.escalations.findEscalations(need.id, caller.id);
    const resolved = rows.find((row) => row.status === NeedEscalationStatus.RESOLVED);
    if (resolved) {
      return this.continue(responsibility.id, caller);
    }

    const open = rows.find(
      (row) =>
        row.status === NeedEscalationStatus.PENDING ||
        row.status === NeedEscalationStatus.ACKNOWLEDGED,
    );
    if (!open) {
      await this.escalations.escalate(need.id, dto.reason?.trim() || undefined, caller.id);
    }

    responsibility = await this.responsibilities.markPersonalNeedWaitingOnThirdParty(
      responsibility.id,
      caller,
    );
    return this.projectWithKnownSources(
      responsibility,
      need,
      await this.needs.findMatchingResources(need.id, caller.id),
      null,
      PersonalResolutionRouteKind.HUMAN_STEWARD,
      'A Human Steward has been asked to help. Aureus is keeping the Responsibility open while that human work is pending.',
      false,
    );
  }

  private async project(
    responsibility: ResponsibilityResponseDto,
    need: StatedNeedResponseDto,
    caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    const [offers, resources, escalationRows] = await Promise.all([
      this.needs.findOffers(need.id, caller.id),
      this.needs.findMatchingResources(need.id, caller.id),
      this.escalations.findEscalations(need.id, caller.id),
    ]);

    if (responsibility.status === ResponsibilityStatus.COMPLETED) {
      return this.projectWithKnownSources(
        responsibility,
        need,
        resources,
        null,
        PersonalResolutionRouteKind.NONE,
        null,
        false,
      );
    }
    if (
      responsibility.status === ResponsibilityStatus.RESPONSIBLY_EXHAUSTED ||
      responsibility.status === ResponsibilityStatus.CANCELLED
    ) {
      return this.projectWithKnownSources(
        responsibility,
        need,
        resources,
        null,
        PersonalResolutionRouteKind.NONE,
        null,
        false,
      );
    }

    const openEscalation = escalationRows.find(
      (row) =>
        row.status === NeedEscalationStatus.PENDING ||
        row.status === NeedEscalationStatus.ACKNOWLEDGED,
    );
    if (openEscalation) {
      return this.projectWithKnownSources(
        responsibility,
        need,
        resources,
        null,
        PersonalResolutionRouteKind.HUMAN_STEWARD,
        'Human Steward help is in progress.',
        false,
      );
    }

    const accepted = offers.find((offer) => offer.response === ResourceOfferResponse.ACCEPTED);
    if (accepted) {
      return this.projectWithKnownSources(
        responsibility,
        need,
        resources,
        accepted.citySheetEntryId,
        PersonalResolutionRouteKind.VERIFIED_RESOURCE,
        'A resource you accepted is in progress. Aureus has not recorded proof that the need is resolved yet.',
        false,
      );
    }

    const safeIds = new Set(resources.map((resource) => resource.id));
    const pending = offers.find(
      (offer) =>
        offer.response === ResourceOfferResponse.PENDING &&
        safeIds.has(offer.citySheetEntryId),
    );
    if (pending) {
      return this.projectWithKnownSources(
        responsibility,
        need,
        resources,
        pending.citySheetEntryId,
        PersonalResolutionRouteKind.VERIFIED_RESOURCE,
        'Review this verified resource route and tell Aureus whether you want to use it.',
        true,
      );
    }

    if (matchCategoriesForNeed(need.content).length === 0) {
      return this.projectWithKnownSources(
        responsibility,
        need,
        resources,
        null,
        PersonalResolutionRouteKind.CLARIFICATION,
        'Aureus needs one more detail about the need before choosing a responsible route.',
        true,
      );
    }

    return this.projectWithKnownSources(
      responsibility,
      need,
      resources,
      null,
      PersonalResolutionRouteKind.NONE,
      'Aureus is checking the next responsible route.',
      false,
    );
  }

  private projectWithKnownSources(
    responsibility: ResponsibilityResponseDto,
    need: StatedNeedResponseDto,
    resources: MatchedResourceDto[],
    currentResourceId: string | null,
    routeKind: PersonalResolutionRouteKind,
    nextStep: string | null,
    memberActionRequired: boolean,
  ): PersonalResolutionStateDto {
    const currentResource = currentResourceId
      ? resources.find((resource) => resource.id === currentResourceId) ?? null
      : null;

    return {
      responsibility,
      statedNeedId: need.id,
      routeKind,
      currentResource,
      nextStep,
      memberActionRequired,
      evidenceMeaning: this.evidenceMeaning(responsibility),
    };
  }

  private evidenceMeaning(responsibility: ResponsibilityResponseDto): string {
    if (responsibility.status === ResponsibilityStatus.COMPLETED) {
      const completionEvidence = [...responsibility.events]
        .reverse()
        .find((event) => event.evidenceLevel != null);
      if (completionEvidence?.evidenceLevel === ResponsibilityEvidenceLevel.VERIFIED) {
        return 'Completion is backed by independently verified source evidence.';
      }
      return 'A source-domain outcome was reported complete. Aureus is not representing that report as independent third-party verification.';
    }

    if (responsibility.status === ResponsibilityStatus.RESPONSIBLY_EXHAUSTED) {
      return 'Aureus recorded evidence that no currently safe authorized route remained. This does not mean the underlying human need stopped mattering.';
    }

    return 'No completion evidence has been recorded. A resource offer, acceptance, or handoff is not treated as proof that the need is resolved.';
  }

  private async getNeedForResponsibility(
    responsibility: ResponsibilityResponseDto,
    callerId: string,
  ): Promise<StatedNeedResponseDto> {
    const criteria = responsibility.successCriteria as { statedNeedId?: unknown } | null;
    const statedNeedId =
      criteria && typeof criteria.statedNeedId === 'string'
        ? criteria.statedNeedId
        : null;
    if (!statedNeedId) {
      throw new NotFoundException('Personal-need Responsibility source was not found');
    }

    const need = await this.getOwnedNeed(statedNeedId, callerId);
    if (need.conversationId !== responsibility.originConversationId) {
      throw new NotFoundException('Personal-need Responsibility source was not found');
    }
    return need;
  }

  private async getOwnedNeed(
    statedNeedId: string,
    callerId: string,
  ): Promise<StatedNeedResponseDto> {
    // NeedsService intentionally exposes only self-scoped DTOs. Reuse that
    // boundary rather than exporting its repository into OR-004.
    const mine = await this.needs.findMine(callerId);
    const need = mine.find((candidate) => candidate.id === statedNeedId);
    if (!need) throw new NotFoundException('Stated need not found');
    return need;
  }
}
