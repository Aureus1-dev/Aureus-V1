import {
  NeedEscalationStatus,
  ResourceOfferResponse,
  ResponsibilityEvidenceLevel,
  ResponsibilityStatus,
} from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
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
  content: 'My electricity will be shut off Friday',
  createdAt: new Date('2026-09-12T12:00:00Z'),
};

const resource = (id: string, ref: string): MatchedResourceDto =>
  ({
    id,
    citySheetRef: ref,
    organizationName: `Resource ${ref}`,
    category: 'UTILITY_ASSISTANCE',
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

  it('requires real UnresolvedNeed evidence before exhausting an absent-route need', async () => {
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
      recordedAt: new Date(),
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
        sourceRecordType: 'UnresolvedNeed',
        sourceRecordId: '88888888-8888-4888-8888-888888888888',
        evidenceLevel: ResponsibilityEvidenceLevel.VERIFIED,
      }),
    );
    expect(result.responsibility.status).toBe(ResponsibilityStatus.RESPONSIBLY_EXHAUSTED);
  });

  it('distinguishes all-declined routes from no-resource safe failure', async () => {
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
    responsibilities.exhaustPersonalNeedWithEvidence.mockResolvedValue(
      responsibility(ResponsibilityStatus.RESPONSIBLY_EXHAUSTED),
    );

    await service.continue('44444444-4444-4444-8444-444444444444', caller);

    expect(needs.checkSafeFailure).not.toHaveBeenCalled();
    expect(responsibilities.exhaustPersonalNeedWithEvidence).toHaveBeenCalledWith(
      expect.any(String),
      caller,
      expect.objectContaining({
        sourceRecordType: 'ResourceOffer',
        sourceRecordId: '77777777-7777-4777-8777-777777777777',
        sourceState: 'ALL_CURRENT_VERIFIED_ROUTES_DECLINED_NO_STEWARD_REACHABLE',
        evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
      }),
    );
  });

  it('pages a human only after the member explicitly asks', async () => {
    responsibilities.findOwnedPersonalNeedResolution.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_USER),
    );
    responsibilities.markPersonalNeedWaitingOnThirdParty.mockResolvedValue(
      responsibility(ResponsibilityStatus.WAITING_ON_THIRD_PARTY),
    );

    const result = await service.requestHumanSteward(
      '44444444-4444-4444-8444-444444444444',
      { reason: 'I need someone to call with me' },
      caller,
    );

    expect(escalations.escalate).toHaveBeenCalledWith(
      need.id,
      'I need someone to call with me',
      caller.id,
    );
    expect(result.routeKind).toBe(PersonalResolutionRouteKind.HUMAN_STEWARD);
    expect(result.responsibility.status).toBe(ResponsibilityStatus.WAITING_ON_THIRD_PARTY);
  });

  it('completes only as REPORTED when the source NeedEscalation is resolved', async () => {
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
        resolutionNotes: 'Member reported utility service is stable.',
        resolvedAt: new Date(),
        createdAt: new Date(),
      },
    ]);
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
          sourceRecordType: 'NeedEscalation',
          sourceRecordId: '99999999-9999-4999-8999-999999999999',
          sourceState: NeedEscalationStatus.RESOLVED,
          evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
          occurredAt: new Date(),
        } as ResponsibilityResponseDto['events'][number],
      ]),
    );

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(responsibilities.completePersonalNeedWithEvidence).toHaveBeenCalledWith(
      expect.any(String),
      caller,
      expect.objectContaining({
        sourceRecordType: 'NeedEscalation',
        evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
      }),
    );
    expect(result.responsibility.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(result.evidenceMeaning).toContain('not representing that report as independent');
  });
});
