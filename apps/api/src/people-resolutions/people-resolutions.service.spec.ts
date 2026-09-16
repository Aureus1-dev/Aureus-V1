import { NotFoundException } from '@nestjs/common';
import {
  CitySheetCategory,
  NeedEscalationStatus,
  NeedOutcomeStatus,
  ResourceOfferResponse,
  ResponsibilityEvidenceLevel,
  ResponsibilityStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MatchedResourceDto } from '../needs/dto/matched-resource.dto';
import { NeedEscalationsService } from '../needs/need-escalations.service';
import { NeedsService } from '../needs/needs.service';
import { ResponsibilityResponseDto } from '../responsibilities/dto/responsibility-response.dto';
import { ResponsibilitiesService } from '../responsibilities/responsibilities.service';
import { PersonalResolutionRouteKind } from './people-resolutions.dto';
import { PeopleResolutionsService } from './people-resolutions.service';

const caller = { id: '11111111-1111-4111-8111-111111111111' } as AuthenticatedUser;
const need = {
  id: '22222222-2222-4222-8222-222222222222',
  conversationId: '33333333-3333-4333-8333-333333333333',
  content: 'My electric bill is overdue and my utilities will be shut off Friday',
  createdAt: new Date('2026-09-12T12:00:00Z'),
};

const resource = (id: string, ref: string): MatchedResourceDto =>
  ({
    id,
    citySheetRef: ref,
    organizationName: `Resource ${ref}`,
    category: CitySheetCategory.HOUSING_UTILITIES,
    description: 'Verified utility help',
    address: null,
    serviceArea: 'Philadelphia',
    phone: null,
    website: null,
    hours: '9-5',
    eligibilityRequirements: null,
    languagesSupported: ['English'],
    accessibilityNotes: null,
    cost: null,
    requiredDocuments: [],
    referralRequired: false,
    isEmergencyService: false,
    verificationStatus: 'VERIFIED',
    isTestFixture: false,
  }) as unknown as MatchedResourceDto;

const responsibility = (
  status: ResponsibilityStatus,
  events: ResponsibilityResponseDto['events'] = [],
): ResponsibilityResponseDto =>
  ({
    id: '44444444-4444-4444-8444-444444444444',
    kind: 'PERSONAL_NEED_RESOLUTION',
    objective: 'Keep my electricity on',
    status,
    contextType: 'PERSONAL',
    authorityClass: 'GUIDANCE_ONLY',
    authorityPolicyVersion: 'responsibility-guidance-v1',
    privacyScope: 'PERSONAL_PRIVATE',
    privacyPolicyVersion: 'personal-private-v1',
    originConversationId: need.conversationId,
    originOpportunityId: null,
    successCriteria: { statedNeedId: need.id },
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    events,
  }) as unknown as ResponsibilityResponseDto;

describe('PeopleResolutionsService', () => {
  let responsibilities: jest.Mocked<ResponsibilitiesService>;
  let needs: jest.Mocked<NeedsService>;
  let escalations: jest.Mocked<NeedEscalationsService>;
  let service: PeopleResolutionsService;

  beforeEach(() => {
    responsibilities = {
      acceptPersonalNeedResolution: jest.fn(),
      findOwnedPersonalNeedResolution: jest.fn(),
      markPersonalNeedWaitingOnUser: jest.fn(),
      markPersonalNeedWaitingOnThirdParty: jest.fn(),
      resumePersonalNeedForAureus: jest.fn(),
      completePersonalNeedWithEvidence: jest.fn(),
      exhaustPersonalNeedWithEvidence: jest.fn(),
    } as unknown as jest.Mocked<ResponsibilitiesService>;

    needs = {
      findMine: jest.fn().mockResolvedValue([need]),
      findOffers: jest.fn().mockResolvedValue([]),
      findMatchingResources: jest.fn().mockResolvedValue([]),
      offerResource: jest.fn(),
      respondToOffer: jest.fn(),
      checkSafeFailure: jest.fn().mockResolvedValue({
        triggered: false,
        recordId: null,
        reason: null,
        message: null,
        nextStep: null,
        recordedAt: null,
      }),
      isHumanStewardReachable: jest.fn().mockResolvedValue(true),
      findLatestOutcomeReport: jest.fn().mockResolvedValue(null),
      recordOutcomeReport: jest.fn(),
    } as unknown as jest.Mocked<NeedsService>;

    escalations = {
      findEscalations: jest.fn().mockResolvedValue([]),
      escalate: jest.fn(),
    } as unknown as jest.Mocked<NeedEscalationsService>;

    service = new PeopleResolutionsService(responsibilities, needs, escalations);
  });

  it('does not accept another member\'s stated need', async () => {
    needs.findMine.mockResolvedValue([]);

    await expect(
      service.accept(
        { statedNeedId: need.id, objective: 'Keep my electricity on' },
        caller,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(responsibilities.acceptPersonalNeedResolution).not.toHaveBeenCalled();
  });

  it('offers the next currently verified resource and waits on the member', async () => {
    const first = resource('55555555-5555-4555-8555-555555555555', 'AUR-CS-000002');
    const second = resource('66666666-6666-4666-8666-666666666666', 'AUR-CS-000003');
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.ACTIVE),
    );
    needs.findOffers.mockResolvedValue([
      {
        id: '77777777-7777-4777-8777-777777777777',
        statedNeedId: need.id,
        citySheetEntryId: first.id,
        response: ResourceOfferResponse.DECLINED,
        offeredAt: new Date(),
        respondedAt: new Date(),
      },
    ]);
    needs.findMatchingResources.mockResolvedValue([first, second]);
    responsibilities.markPersonalNeedWaitingOnUser.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_USER),
    );

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(needs.offerResource).toHaveBeenCalledWith(need.id, second.id, caller.id);
    expect(result.routeKind).toBe(PersonalResolutionRouteKind.VERIFIED_RESOURCE);
    expect(result.currentResource?.id).toBe(second.id);
    expect(result.memberActionRequired).toBe(true);
  });

  it('treats an accepted resource as waiting, never completion evidence', async () => {
    const current = resource('55555555-5555-4555-8555-555555555555', 'AUR-CS-000002');
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_USER),
    );
    needs.findOffers.mockResolvedValue([
      {
        id: '77777777-7777-4777-8777-777777777777',
        statedNeedId: need.id,
        citySheetEntryId: current.id,
        response: ResourceOfferResponse.ACCEPTED,
        offeredAt: new Date(),
        respondedAt: new Date(),
      },
    ]);
    needs.findMatchingResources.mockResolvedValue([current]);
    responsibilities.markPersonalNeedWaitingOnThirdParty.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_THIRD_PARTY),
    );

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(result.responsibility.status).toBe(ResponsibilityStatus.WAITING_ON_THIRD_PARTY);
    expect(responsibilities.completePersonalNeedWithEvidence).not.toHaveBeenCalled();
    expect(result.evidenceMeaning).toContain('not treated as proof');
  });

  it('does not page a human merely because no verified resource exists', async () => {
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.ACTIVE),
    );
    needs.findMatchingResources.mockResolvedValue([]);
    needs.checkSafeFailure.mockResolvedValue({
      triggered: false,
      recordId: null,
      reason: null,
      message: null,
      nextStep: null,
      recordedAt: null,
    });
    responsibilities.markPersonalNeedWaitingOnUser.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_USER),
    );

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(result.routeKind).toBe(PersonalResolutionRouteKind.HUMAN_STEWARD);
    expect(result.memberActionRequired).toBe(true);
    expect(escalations.escalate).not.toHaveBeenCalled();
  });

  it('records current safe failure but does not terminally exhaust a transient dead end', async () => {
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.ACTIVE),
    );
    needs.findMatchingResources.mockResolvedValue([]);
    needs.checkSafeFailure.mockResolvedValue({
      triggered: true,
      recordId: '88888888-8888-4888-8888-888888888888',
      reason: 'NO_VERIFIED_RESOURCE_NO_STEWARD',
      message: 'No verified route is available.',
      nextStep: 'Aureus will preserve the need.',
      recordedAt: new Date('2026-09-12T12:05:00Z'),
    });
    responsibilities.resumePersonalNeedForAureus.mockResolvedValue(
      responsibility(ResponsibilityStatus.ACTIVE),
    );

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(needs.checkSafeFailure).toHaveBeenCalledWith(need.id, caller.id);
    expect(responsibilities.exhaustPersonalNeedWithEvidence).not.toHaveBeenCalled();
    expect(responsibilities.resumePersonalNeedForAureus).toHaveBeenCalledWith(
      expect.any(String),
      caller,
    );
    expect(result.responsibility.status).toBe(ResponsibilityStatus.ACTIVE);
    expect(result.routeKind).toBe(PersonalResolutionRouteKind.NONE);
    expect(result.memberActionRequired).toBe(false);
    expect(result.nextStep).toContain('keeping this Responsibility open');
  });

  it('responsibly exhausts only after a persisted no-route state is followed by a later still-unresolved report and the no-route state remains current', async () => {
    const recordedAt = new Date('2026-09-12T12:05:00Z');
    const unresolvedReport = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: caller.id,
      statedNeedId: need.id,
      status: NeedOutcomeStatus.STILL_UNRESOLVED,
      note: 'I still need help.',
      createdAt: new Date('2026-09-12T12:10:00Z'),
    };
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.ACTIVE),
    );
    needs.findLatestOutcomeReport.mockResolvedValue(unresolvedReport as never);
    needs.findMatchingResources.mockResolvedValue([]);
    needs.checkSafeFailure.mockResolvedValue({
      triggered: true,
      recordId: '88888888-8888-4888-8888-888888888888',
      reason: 'NO_VERIFIED_RESOURCE_NO_STEWARD',
      message: 'No verified route is available.',
      nextStep: 'Aureus will preserve the need.',
      recordedAt,
    });
    responsibilities.exhaustPersonalNeedWithEvidence.mockResolvedValue(
      responsibility(ResponsibilityStatus.RESPONSIBLY_EXHAUSTED),
    );

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(responsibilities.exhaustPersonalNeedWithEvidence).toHaveBeenCalledWith(
      expect.any(String),
      caller,
      expect.objectContaining({
        sourceSystem: 'NEEDS',
        sourceRecordType: 'UnresolvedNeed',
        sourceRecordId: '88888888-8888-4888-8888-888888888888',
        sourceState: 'NO_VERIFIED_RESOURCE_NO_STEWARD',
        evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
      }),
    );
    expect(responsibilities.resumePersonalNeedForAureus).not.toHaveBeenCalled();
    expect(result.responsibility.status).toBe(ResponsibilityStatus.RESPONSIBLY_EXHAUSTED);
    expect(result.routeKind).toBe(PersonalResolutionRouteKind.NONE);
    expect(result.memberActionRequired).toBe(false);
    expect(result.nextStep).toContain('could not achieve');
  });

  it('keeps ownership after all current verified routes are declined and no human is reachable', async () => {
    const current = resource('55555555-5555-4555-8555-555555555555', 'AUR-CS-000002');
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_USER),
    );
    needs.findMatchingResources.mockResolvedValue([current]);
    needs.findOffers.mockResolvedValue([
      {
        id: '77777777-7777-4777-8777-777777777777',
        statedNeedId: need.id,
        citySheetEntryId: current.id,
        response: ResourceOfferResponse.DECLINED,
        offeredAt: new Date(),
        respondedAt: new Date(),
      },
    ]);
    needs.isHumanStewardReachable.mockResolvedValue(false);
    responsibilities.resumePersonalNeedForAureus.mockResolvedValue(
      responsibility(ResponsibilityStatus.ACTIVE),
    );

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(needs.checkSafeFailure).not.toHaveBeenCalled();
    expect(responsibilities.exhaustPersonalNeedWithEvidence).not.toHaveBeenCalled();
    expect(responsibilities.resumePersonalNeedForAureus).toHaveBeenCalledWith(
      expect.any(String),
      caller,
    );
    expect(result.responsibility.status).toBe(ResponsibilityStatus.ACTIVE);
    expect(result.memberActionRequired).toBe(false);
    expect(result.nextStep).toContain('keeping the Responsibility open');
  });

  it('pages a human only after the member explicitly asks and a human is reachable', async () => {
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_USER),
    );
    needs.isHumanStewardReachable.mockResolvedValue(true);
    responsibilities.markPersonalNeedWaitingOnThirdParty.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_THIRD_PARTY),
    );

    const result = await service.requestHumanSteward(
      '44444444-4444-4444-8444-444444444444',
      { reason: 'I need someone to call with me' },
      caller,
    );

    expect(needs.isHumanStewardReachable).toHaveBeenCalled();
    expect(escalations.escalate).toHaveBeenCalledWith(
      need.id,
      'I need someone to call with me',
      caller.id,
    );
    expect(result.routeKind).toBe(PersonalResolutionRouteKind.HUMAN_STEWARD);
    expect(result.responsibility.status).toBe(ResponsibilityStatus.WAITING_ON_THIRD_PARTY);
  });

  it('does not create a phantom human handoff when the member asks and nobody is reachable', async () => {
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_USER),
    );
    needs.isHumanStewardReachable.mockResolvedValue(false);
    responsibilities.resumePersonalNeedForAureus.mockResolvedValue(
      responsibility(ResponsibilityStatus.ACTIVE),
    );

    const result = await service.requestHumanSteward(
      '44444444-4444-4444-8444-444444444444',
      { reason: 'I need someone to call with me' },
      caller,
    );

    expect(escalations.escalate).not.toHaveBeenCalled();
    expect(responsibilities.markPersonalNeedWaitingOnThirdParty).not.toHaveBeenCalled();
    expect(responsibilities.exhaustPersonalNeedWithEvidence).not.toHaveBeenCalled();
    expect(responsibilities.resumePersonalNeedForAureus).toHaveBeenCalledWith(
      expect.any(String),
      caller,
    );
    expect(result.responsibility.status).toBe(ResponsibilityStatus.ACTIVE);
    expect(result.routeKind).toBe(PersonalResolutionRouteKind.NONE);
    expect(result.memberActionRequired).toBe(false);
    expect(result.nextStep).toContain('did not create a phantom handoff');
  });

  it('reuses an already-open human escalation without creating another one', async () => {
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_THIRD_PARTY),
    );
    escalations.findEscalations.mockResolvedValue([
      {
        id: '99999999-9999-4999-8999-999999999999',
        statedNeedId: need.id,
        reason: 'Existing request',
        status: NeedEscalationStatus.PENDING,
        acknowledgedAt: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date(),
      },
    ]);
    responsibilities.markPersonalNeedWaitingOnThirdParty.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_THIRD_PARTY),
    );

    const result = await service.requestHumanSteward(
      '44444444-4444-4444-8444-444444444444',
      { reason: 'Please help' },
      caller,
    );

    expect(needs.isHumanStewardReachable).not.toHaveBeenCalled();
    expect(escalations.escalate).not.toHaveBeenCalled();
    expect(result.routeKind).toBe(PersonalResolutionRouteKind.HUMAN_STEWARD);
  });

  it('newer open human escalation wins over older resolved history', async () => {
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.ACTIVE),
    );
    const now = new Date();
    escalations.findEscalations.mockResolvedValue([
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        statedNeedId: need.id,
        reason: 'Current request',
        status: NeedEscalationStatus.PENDING,
        acknowledgedAt: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: now,
      },
      {
        id: '99999999-9999-4999-8999-999999999999',
        statedNeedId: need.id,
        reason: 'Older request',
        status: NeedEscalationStatus.RESOLVED,
        acknowledgedAt: new Date(now.getTime() - 2000),
        resolutionNotes: 'Called the member back.',
        resolvedAt: new Date(now.getTime() - 1000),
        createdAt: new Date(now.getTime() - 3000),
      },
    ]);
    responsibilities.markPersonalNeedWaitingOnThirdParty.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_THIRD_PARTY),
    );

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(responsibilities.markPersonalNeedWaitingOnThirdParty).toHaveBeenCalled();
    expect(responsibilities.completePersonalNeedWithEvidence).not.toHaveBeenCalled();
    expect(result.routeKind).toBe(PersonalResolutionRouteKind.HUMAN_STEWARD);
  });

  it('does not confuse a resolved human escalation with the underlying life outcome', async () => {
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_THIRD_PARTY),
    );
    escalations.findEscalations.mockResolvedValue([
      {
        id: '99999999-9999-4999-8999-999999999999',
        statedNeedId: need.id,
        reason: null,
        status: NeedEscalationStatus.RESOLVED,
        acknowledgedAt: new Date(),
        resolutionNotes: 'Called the member back.',
        resolvedAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    responsibilities.markPersonalNeedWaitingOnUser.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_USER),
    );

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(responsibilities.completePersonalNeedWithEvidence).not.toHaveBeenCalled();
    expect(result.responsibility.status).toBe(ResponsibilityStatus.WAITING_ON_USER);
    expect(result.nextStep).toContain('does not prove the underlying need is resolved');
  });

  it('completes as REPORTED only after the member explicitly reports the underlying need resolved', async () => {
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_THIRD_PARTY),
    );
    const report = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      userId: caller.id,
      statedNeedId: need.id,
      status: NeedOutcomeStatus.RESOLVED,
      note: 'My electricity stayed on.',
      createdAt: new Date(),
    };
    needs.recordOutcomeReport.mockResolvedValue(report as never);
    responsibilities.completePersonalNeedWithEvidence.mockResolvedValue(
      responsibility(ResponsibilityStatus.COMPLETED, [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          type: 'COMPLETED',
          actorClass: 'SYSTEM',
          actorUserId: null,
          fromStatus: ResponsibilityStatus.WAITING_ON_THIRD_PARTY,
          toStatus: ResponsibilityStatus.COMPLETED,
          sourceSystem: 'NEEDS',
          sourceRecordType: 'NeedOutcomeReport',
          sourceRecordId: report.id,
          sourceState: NeedOutcomeStatus.RESOLVED,
          evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
          occurredAt: new Date(),
        } as ResponsibilityResponseDto['events'][number],
      ]),
    );

    const result = await service.reportOutcome(
      '44444444-4444-4444-8444-444444444444',
      { resolved: true, note: 'My electricity stayed on.' },
      caller,
    );

    expect(needs.recordOutcomeReport).toHaveBeenCalledWith(
      need.id,
      NeedOutcomeStatus.RESOLVED,
      'My electricity stayed on.',
      caller.id,
    );
    expect(responsibilities.completePersonalNeedWithEvidence).toHaveBeenCalledWith(
      expect.any(String),
      caller,
      expect.objectContaining({
        sourceRecordType: 'NeedOutcomeReport',
        sourceRecordId: report.id,
        evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
      }),
    );
    expect(result.responsibility.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(result.evidenceMeaning).toContain('not representing that report as independent');
  });
});
