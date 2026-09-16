import {
  NeedOutcomeStatus,
  ResponsibilityEvidenceLevel,
  ResponsibilityStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NeedEscalationsService } from '../needs/need-escalations.service';
import { NeedsService } from '../needs/needs.service';
import { ResponsibilityResponseDto } from '../responsibilities/dto/responsibility-response.dto';
import { ResponsibilitiesService } from '../responsibilities/responsibilities.service';
import { PersonalResolutionRouteKind } from './people-resolutions.dto';
import { PeopleResolutionsService } from './people-resolutions.service';

const caller = { id: '11111111-1111-4111-8111-111111111111' } as AuthenticatedUser;
const statedNeed = {
  id: '22222222-2222-4222-8222-222222222222',
  conversationId: '33333333-3333-4333-8333-333333333333',
  content: 'My electric bill is overdue and my utilities will be shut off Friday',
  createdAt: new Date('2026-09-12T12:00:00Z'),
};

const responsibility = (status: ResponsibilityStatus): ResponsibilityResponseDto =>
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
    originConversationId: statedNeed.conversationId,
    originOpportunityId: null,
    successCriteria: { statedNeedId: statedNeed.id },
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    events: [],
  }) as unknown as ResponsibilityResponseDto;

function buildHarness() {
  const responsibilities = {
    findOwnedPersonalNeedResolution: jest
      .fn()
      .mockResolvedValue(responsibility(ResponsibilityStatus.ACTIVE)),
    markPersonalNeedWaitingOnUser: jest.fn(),
    markPersonalNeedWaitingOnThirdParty: jest.fn(),
    resumePersonalNeedForAureus: jest
      .fn()
      .mockResolvedValue(responsibility(ResponsibilityStatus.ACTIVE)),
    completePersonalNeedWithEvidence: jest.fn(),
    exhaustPersonalNeedWithEvidence: jest.fn(),
  } as unknown as jest.Mocked<ResponsibilitiesService>;

  const needs = {
    findMine: jest.fn().mockResolvedValue([statedNeed]),
    findOffers: jest.fn().mockResolvedValue([]),
    findMatchingResources: jest.fn().mockResolvedValue([]),
    checkSafeFailure: jest.fn(),
    isHumanStewardReachable: jest.fn(),
    findLatestOutcomeReport: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<NeedsService>;

  const escalations = {
    findEscalations: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<NeedEscalationsService>;

  return {
    responsibilities,
    needs,
    service: new PeopleResolutionsService(responsibilities, needs, escalations),
  };
}

describe('PeopleResolutionsService — Step 1 hardening', () => {
  it('does not infer Human Steward reachability from a non-triggered compound safe-failure result', async () => {
    const { service, needs, responsibilities } = buildHarness();
    needs.checkSafeFailure.mockResolvedValue({
      triggered: false,
      recordId: null,
      reason: null,
      message: null,
      nextStep: null,
      recordedAt: null,
    });
    needs.isHumanStewardReachable.mockResolvedValue(false);

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(needs.isHumanStewardReachable).toHaveBeenCalledTimes(1);
    expect(responsibilities.markPersonalNeedWaitingOnUser).not.toHaveBeenCalled();
    expect(responsibilities.resumePersonalNeedForAureus).toHaveBeenCalledWith(
      expect.any(String),
      caller,
    );
    expect(result.routeKind).toBe(PersonalResolutionRouteKind.NONE);
    expect(result.memberActionRequired).toBe(false);
    expect(result.nextStep).toContain('no Human Steward is reachable');
  });

  it('does not exhaust when the still-unresolved report predates the persisted no-route record', async () => {
    const { service, needs, responsibilities } = buildHarness();
    needs.findLatestOutcomeReport.mockResolvedValue({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: caller.id,
      statedNeedId: statedNeed.id,
      status: NeedOutcomeStatus.STILL_UNRESOLVED,
      note: 'Still unresolved before the no-route record.',
      createdAt: new Date('2026-09-12T12:04:00Z'),
    } as never);
    needs.checkSafeFailure.mockResolvedValue({
      triggered: true,
      recordId: '88888888-8888-4888-8888-888888888888',
      reason: 'NO_VERIFIED_RESOURCE_NO_STEWARD',
      message: 'No verified route is available.',
      nextStep: 'Aureus will preserve the need.',
      recordedAt: new Date('2026-09-12T12:05:00Z'),
    });

    const result = await service.continue(
      '44444444-4444-4444-8444-444444444444',
      caller,
    );

    expect(responsibilities.exhaustPersonalNeedWithEvidence).not.toHaveBeenCalled();
    expect(responsibilities.resumePersonalNeedForAureus).toHaveBeenCalled();
    expect(result.responsibility.status).toBe(ResponsibilityStatus.ACTIVE);
  });

  it('carries both the persisted no-route record and the later member report into exhaustion evidence', async () => {
    const { service, needs, responsibilities } = buildHarness();
    const reportId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    needs.findLatestOutcomeReport.mockResolvedValue({
      id: reportId,
      userId: caller.id,
      statedNeedId: statedNeed.id,
      status: NeedOutcomeStatus.STILL_UNRESOLVED,
      note: 'I still need help.',
      createdAt: new Date('2026-09-12T12:10:00Z'),
    } as never);
    needs.checkSafeFailure.mockResolvedValue({
      triggered: true,
      recordId: '88888888-8888-4888-8888-888888888888',
      reason: 'NO_VERIFIED_RESOURCE_NO_STEWARD',
      message: 'No verified route is available.',
      nextStep: 'Aureus will preserve the need.',
      recordedAt: new Date('2026-09-12T12:05:00Z'),
    });
    responsibilities.exhaustPersonalNeedWithEvidence.mockResolvedValue(
      responsibility(ResponsibilityStatus.RESPONSIBLY_EXHAUSTED),
    );

    await service.continue('44444444-4444-4444-8444-444444444444', caller);

    expect(responsibilities.exhaustPersonalNeedWithEvidence).toHaveBeenCalledWith(
      expect.any(String),
      caller,
      expect.objectContaining({
        sourceRecordType: 'UnresolvedNeed',
        sourceRecordId: '88888888-8888-4888-8888-888888888888',
        supportingEvidence: [
          expect.objectContaining({
            sourceSystem: 'NEEDS',
            sourceRecordType: 'NeedOutcomeReport',
            sourceRecordId: reportId,
            sourceState: NeedOutcomeStatus.STILL_UNRESOLVED,
            evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
          }),
        ],
      }),
    );
  });
});
