import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  ResponsibilityKind,
  ResponsibilityStatus,
  TrackingStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PeopleHelpService } from './people-help.service';

const caller: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'member@example.test',
  roles: ['MEMBER'],
};

const responsibility = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  kind: ResponsibilityKind.OPPORTUNITY_APPLICATION_GUIDANCE,
  objective: 'Help me work through the verified application',
  status: ResponsibilityStatus.ACTIVE,
  contextType: 'PERSONAL',
  authorityClass: 'GUIDANCE_ONLY',
  authorityPolicyVersion: 'responsibility-guidance-v1',
  privacyScope: 'PERSONAL_PRIVATE',
  privacyPolicyVersion: 'personal-private-v1',
  originConversationId: '22222222-2222-4222-8222-222222222222',
  originOpportunityId: '33333333-3333-4333-8333-333333333333',
  successCriteria: {},
  dueAt: null,
  retentionExpiresAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  events: [],
} as const;

const session = {
  id: '44444444-4444-4444-8444-444444444444',
  userId: caller.id,
  conversationId: '22222222-2222-4222-8222-222222222222',
  opportunityId: '33333333-3333-4333-8333-333333333333',
  applicationUrl: 'https://benefits.example.gov/apply',
  status: 'ACTIVE',
  screenCaptureConsentGrantedAt: null,
  screenCaptureConsentRevokedAt: null,
  lastFrameAnalyzedAt: null,
  endedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;

describe('PeopleHelpService', () => {
  const responsibilities = {
    acceptApplicationGuidance: jest.fn(),
    findOpenApplicationGuidance: jest.fn(),
    findLatestApplicationGuidanceForConversation: jest.fn(),
    pauseApplicationGuidance: jest.fn(),
    completeApplicationGuidance: jest.fn(),
  };
  const guidedApplications = {
    startSession: jest.fn(),
    findActive: jest.fn(),
    getOwnedForCoordination: jest.fn(),
    endSession: jest.fn(),
  };
  const savedOpportunities = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  let service: PeopleHelpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PeopleHelpService(
      responsibilities as never,
      guidedApplications as never,
      savedOpportunities as never,
    );
  });

  it('accepts the durable Responsibility before starting the tool-level guide', async () => {
    responsibilities.acceptApplicationGuidance.mockResolvedValue(responsibility);
    guidedApplications.startSession.mockResolvedValue({
      id: session.id,
      conversationId: session.conversationId,
      opportunityId: session.opportunityId,
      opportunityTitle: 'Verified benefit',
      provider: 'Provider',
      applicationUrl: session.applicationUrl,
      status: 'ACTIVE',
      screenCaptureConsentGrantedAt: null,
      screenCaptureConsentRevokedAt: null,
      lastFrameAnalyzedAt: null,
    });

    const result = await service.start(
      {
        conversationId: session.conversationId,
        opportunityId: session.opportunityId,
      },
      caller,
    );

    expect(
      responsibilities.acceptApplicationGuidance.mock.invocationCallOrder[0],
    ).toBeLessThan(guidedApplications.startSession.mock.invocationCallOrder[0]);
    expect(result.responsibility.id).toBe(responsibility.id);
    expect(result.session.id).toBe(session.id);
  });

  it('returns paused Responsibility progress even when no guide session is active', async () => {
    guidedApplications.findActive.mockResolvedValue(null);
    responsibilities.findLatestApplicationGuidanceForConversation.mockResolvedValue({
      ...responsibility,
      status: ResponsibilityStatus.WAITING_ON_USER,
    });

    const result = await service.findActive(session.conversationId, caller);

    expect(result?.session).toBeNull();
    expect(result?.responsibility?.status).toBe(
      ResponsibilityStatus.WAITING_ON_USER,
    );
  });

  it('ends the guide before moving the Responsibility to WAITING_ON_USER', async () => {
    guidedApplications.getOwnedForCoordination.mockResolvedValue(session);
    responsibilities.findOpenApplicationGuidance.mockResolvedValue(
      responsibility,
    );
    responsibilities.pauseApplicationGuidance.mockResolvedValue({
      ...responsibility,
      status: ResponsibilityStatus.WAITING_ON_USER,
    });

    const result = await service.pause(session.id, caller);

    expect(guidedApplications.endSession).toHaveBeenCalledWith(
      session.id,
      caller,
    );
    expect(
      guidedApplications.endSession.mock.invocationCallOrder[0],
    ).toBeLessThan(
      responsibilities.pauseApplicationGuidance.mock.invocationCallOrder[0],
    );
    expect(result.responsibility?.status).toBe(
      ResponsibilityStatus.WAITING_ON_USER,
    );
  });

  it('records explicit member outcome, revokes guidance, then completes using the SavedOpportunity reference', async () => {
    guidedApplications.getOwnedForCoordination.mockResolvedValue(session);
    responsibilities.findOpenApplicationGuidance.mockResolvedValue(
      responsibility,
    );
    savedOpportunities.findOne.mockResolvedValue(null);
    savedOpportunities.save.mockResolvedValue({
      id: 'saved-1',
      opportunityId: session.opportunityId,
      trackingStatus: TrackingStatus.SAVED,
    });
    savedOpportunities.update.mockResolvedValue({
      id: 'saved-1',
      opportunityId: session.opportunityId,
      trackingStatus: TrackingStatus.APPLIED,
    });
    responsibilities.completeApplicationGuidance.mockResolvedValue({
      ...responsibility,
      status: ResponsibilityStatus.COMPLETED,
    });

    const result = await service.complete(
      session.id,
      TrackingStatus.APPLIED,
      caller,
    );

    expect(savedOpportunities.update).toHaveBeenCalledWith(
      caller.id,
      session.opportunityId,
      { trackingStatus: TrackingStatus.APPLIED },
    );
    expect(
      guidedApplications.endSession.mock.invocationCallOrder[0],
    ).toBeLessThan(
      responsibilities.completeApplicationGuidance.mock.invocationCallOrder[0],
    );
    expect(responsibilities.completeApplicationGuidance).toHaveBeenCalledWith(
      responsibility.id,
      caller,
      'saved-1',
      TrackingStatus.APPLIED,
    );
    expect(result.ended).toBe(true);
    expect(result.outcome).toBe(TrackingStatus.APPLIED);
  });

  it('treats a repeated identical completion request as idempotent after the guide is already ended', async () => {
    const endedSession = { ...session, status: 'ENDED' };
    const completed = {
      ...responsibility,
      status: ResponsibilityStatus.COMPLETED,
      events: [
        {
          id: 'event-completed',
          type: 'COMPLETED',
          actorClass: 'SYSTEM',
          actorUserId: null,
          fromStatus: ResponsibilityStatus.ACTIVE,
          toStatus: ResponsibilityStatus.COMPLETED,
          sourceSystem: 'OPPORTUNITY_ENGINE',
          sourceRecordType: 'SavedOpportunity',
          sourceRecordId: 'saved-1',
          sourceState: TrackingStatus.APPLIED,
          evidenceLevel: 'REPORTED',
          occurredAt: new Date(),
        },
      ],
    };
    guidedApplications.getOwnedForCoordination.mockResolvedValue(endedSession);
    responsibilities.findOpenApplicationGuidance.mockResolvedValue(null);
    responsibilities.findLatestApplicationGuidanceForConversation.mockResolvedValue(
      completed,
    );

    const result = await service.complete(
      session.id,
      TrackingStatus.APPLIED,
      caller,
    );

    expect(result.responsibility.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(savedOpportunities.update).not.toHaveBeenCalled();
    expect(guidedApplications.endSession).not.toHaveBeenCalled();
    expect(responsibilities.completeApplicationGuidance).not.toHaveBeenCalled();
  });

  it('does not complete if the application-help Responsibility is missing', async () => {
    guidedApplications.getOwnedForCoordination.mockResolvedValue(session);
    responsibilities.findOpenApplicationGuidance.mockResolvedValue(null);

    await expect(
      service.complete(session.id, TrackingStatus.APPLIED, caller),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(savedOpportunities.update).not.toHaveBeenCalled();
    expect(guidedApplications.endSession).not.toHaveBeenCalled();
  });

  it('rejects a non-terminal tracking status even if an internal caller attempts it', async () => {
    await expect(
      service.complete(
        session.id,
        TrackingStatus.APPLYING as never,
        caller,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(
      guidedApplications.getOwnedForCoordination,
    ).not.toHaveBeenCalled();
  });
});
