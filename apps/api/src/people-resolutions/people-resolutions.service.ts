import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NeedEscalationStatus,
  NeedOutcomeStatus,
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
  ReportPersonalResolutionOutcomeDto,
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
          nonCompletionStates: [
            'RESOURCE_OFFERED',
            'RESOURCE_ACCEPTED',
            'HUMAN_ESCALATION_OPEN',
            'NO_CURRENT_ROUTE',
          ],
          evidenceMeaning:
            'A resource offer, acceptance, handoff, or temporary lack of a route does not by itself prove the member need was resolved or permanently exhausted.',
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

    const latestOutcome = await this.needs.findLatestOutcomeReport(need.id, caller.id);
    if (latestOutcome?.status === NeedOutcomeStatus.RESOLVED) {
      responsibility = await this.responsibilities.completePersonalNeedWithEvidence(
        responsibility.id,
        caller,
        {
          sourceSystem: 'NEEDS',
          sourceRecordType: 'NeedOutcomeReport',
          sourceRecordId: latestOutcome.id,
          sourceState: NeedOutcomeStatus.RESOLVED,
          evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
        },
      );
      return this.project(responsibility, need, caller);
    }

    const escalationRows = await this.escalations.findEscalations(need.id, caller.id);
    // NeedEscalationsService returns newest-first. Only the current/latest human
    // handoff may drive routing; an older resolved escalation must never mask a
    // newer open one or repeatedly demand outcome confirmation.
    const latestEscalation = escalationRows[0] ?? null;
    if (
      latestEscalation?.status === NeedEscalationStatus.PENDING ||
      latestEscalation?.status === NeedEscalationStatus.ACKNOWLEDGED
    ) {
      responsibility = await this.responsibilities.markPersonalNeedWaitingOnThirdParty(
        responsibility.id,
        caller,
      );
      return this.project(responsibility, need, caller);
    }

    if (latestEscalation?.status === NeedEscalationStatus.RESOLVED) {
      const outcomeAfterResolvedEscalation = Boolean(
        latestOutcome &&
          latestEscalation.resolvedAt &&
          latestOutcome.createdAt >= latestEscalation.resolvedAt
      );
      if (!outcomeAfterResolvedEscalation) {
        responsibility = await this.responsibilities.markPersonalNeedWaitingOnUser(
          responsibility.id,
          caller,
        );
        return this.projectWithKnownSources(
          responsibility,
          need,
          await this.needs.findMatchingResources(need.id, caller.id),
          null,
          PersonalResolutionRouteKind.CLARIFICATION,
          'A Human Steward finished the handoff, but that does not prove the underlying need is resolved. Tell Aureus whether the need itself is now resolved.',
          true,
        );
      }
    }

    const [offers, matchingResources] = await Promise.all([
      this.needs.findOffers(need.id, caller.id),
      this.needs.findMatchingResources(need.id, caller.id),
    ]);

    const acceptedOffer = offers.find(
      (offer) =>
        offer.response === ResourceOfferResponse.ACCEPTED &&
        !(
          latestOutcome?.status === NeedOutcomeStatus.STILL_UNRESOLVED &&
          offer.respondedAt &&
          latestOutcome.createdAt >= offer.respondedAt
        ),
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

    if (matchingResources.length === 0) {
      // Gate C records the current dead end durably, but its trigger includes
      // present-time human reachability. That evidence is intentionally NOT
      // strong enough to terminally exhaust the durable Responsibility.
      const safeFailure = await this.needs.checkSafeFailure(need.id, caller.id);
      if (safeFailure.triggered) {
        responsibility = await this.responsibilities.resumePersonalNeedForAureus(
          responsibility.id,
          caller,
        );
        return this.projectWithKnownSources(
          responsibility,
          need,
          matchingResources,
          null,
          PersonalResolutionRouteKind.NONE,
          'No verified resource or Human Steward is reachable right now. Aureus is keeping this Responsibility open and will continue carrying it as routes change.',
          false,
        );
      }

      // With a recognized need and no verified resource, a non-triggered Gate
      // C safe-failure check means a Human Steward/Admin is currently reachable.
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
        'No verified resource route is available right now. A Human Steward is reachable if you want Aureus to bring one in.',
        true,
      );
    }

    // Verified resources exist, but every currently safe one has already been
    // offered and none is pending or accepted. Confirm they were actually
    // declined before treating the current resource set as spent.
    const declinedCurrentOffers = offers.filter(
      (offer) =>
        offer.response === ResourceOfferResponse.DECLINED &&
        currentlySafeIds.has(offer.citySheetEntryId),
    );
    const allCurrentRoutesDeclined = matchingResources.every((resource) =>
      declinedCurrentOffers.some((offer) => offer.citySheetEntryId === resource.id),
    );

    if (!allCurrentRoutesDeclined) {
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

    // Declining every current resource plus temporary human unavailability is
    // still not durable terminal evidence. The member has completed their
    // decision; return ownership to Aureus and keep the underlying outcome open.
    responsibility = await this.responsibilities.resumePersonalNeedForAureus(
      responsibility.id,
      caller,
    );
    return this.projectWithKnownSources(
      responsibility,
      need,
      matchingResources,
      null,
      PersonalResolutionRouteKind.NONE,
      'You declined the current verified routes and no Human Steward is reachable right now. Aureus is keeping the Responsibility open rather than pretending the need is resolved or permanently exhausted.',
      false,
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

  async reportOutcome(
    responsibilityId: string,
    dto: ReportPersonalResolutionOutcomeDto,
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

    const report = await this.needs.recordOutcomeReport(
      need.id,
      dto.resolved ? NeedOutcomeStatus.RESOLVED : NeedOutcomeStatus.STILL_UNRESOLVED,
      dto.note,
      caller.id,
    );

    if (report.status === NeedOutcomeStatus.RESOLVED) {
      const completed = await this.responsibilities.completePersonalNeedWithEvidence(
        responsibility.id,
        caller,
        {
          sourceSystem: 'NEEDS',
          sourceRecordType: 'NeedOutcomeReport',
          sourceRecordId: report.id,
          sourceState: NeedOutcomeStatus.RESOLVED,
          evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
        },
      );
      return this.project(completed, need, caller);
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
    const latestEscalation = rows[0] ?? null;
    if (latestEscalation?.status === NeedEscalationStatus.RESOLVED) {
      return this.continue(responsibility.id, caller);
    }

    const open =
      latestEscalation?.status === NeedEscalationStatus.PENDING ||
      latestEscalation?.status === NeedEscalationStatus.ACKNOWLEDGED
        ? latestEscalation
        : null;

    if (!open) {
      const humanReachable = await this.needs.isHumanStewardReachable();
      if (!humanReachable) {
        responsibility = await this.responsibilities.resumePersonalNeedForAureus(
          responsibility.id,
          caller,
        );
        return this.projectWithKnownSources(
          responsibility,
          need,
          await this.needs.findMatchingResources(need.id, caller.id),
          null,
          PersonalResolutionRouteKind.NONE,
          'No Human Steward is reachable right now. Aureus did not create a phantom handoff; the Responsibility remains open and Aureus keeps carrying it.',
          false,
        );
      }

      await this.escalations.escalate(
        need.id,
        dto.reason?.trim() || undefined,
        caller.id,
      );
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
    const [offers, resources, escalationRows, latestOutcome] = await Promise.all([
      this.needs.findOffers(need.id, caller.id),
      this.needs.findMatchingResources(need.id, caller.id),
      this.escalations.findEscalations(need.id, caller.id),
      this.needs.findLatestOutcomeReport(need.id, caller.id),
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

    const latestEscalation = escalationRows[0] ?? null;
    if (
      latestEscalation?.status === NeedEscalationStatus.PENDING ||
      latestEscalation?.status === NeedEscalationStatus.ACKNOWLEDGED
    ) {
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

    if (latestEscalation?.status === NeedEscalationStatus.RESOLVED) {
      const outcomeAfterResolvedEscalation = Boolean(
        latestOutcome &&
          latestEscalation.resolvedAt &&
          latestOutcome.createdAt >= latestEscalation.resolvedAt
      );
      if (!outcomeAfterResolvedEscalation) {
        return this.projectWithKnownSources(
          responsibility,
          need,
          resources,
          null,
          PersonalResolutionRouteKind.CLARIFICATION,
          'A Human Steward finished the handoff, but that does not prove the underlying need is resolved. Tell Aureus whether the need itself is now resolved.',
          true,
        );
      }
    }

    const accepted = offers.find(
      (offer) =>
        offer.response === ResourceOfferResponse.ACCEPTED &&
        !(
          latestOutcome?.status === NeedOutcomeStatus.STILL_UNRESOLVED &&
          offer.respondedAt &&
          latestOutcome.createdAt >= offer.respondedAt
        ),
    );
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
      'Aureus is carrying this Responsibility and checking the next responsible route.',
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
      return 'Aureus recorded durable evidence sufficient to close the current Responsibility as responsibly exhausted. Temporary resource or staffing unavailability alone is not treated as terminal evidence.';
    }

    return 'No completion evidence has been recorded. A resource offer, acceptance, handoff, or temporary route failure is not treated as proof that the need is resolved.';
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
