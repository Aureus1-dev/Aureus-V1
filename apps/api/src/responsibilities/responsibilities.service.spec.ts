import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  OpportunityStatus,
  ResponsibilityActorClass,
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
  TrackingStatus,
  VerificationStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ResponsibilitiesService } from './responsibilities.service';
import type {
  IResponsibilityRepository,
  ResponsibilityWithEvents,
} from './repositories/responsibility.repository.interface';

const NOW = new Date('2026-09-01T00:00:00.000Z');
const caller: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'member@example.test',
  roles: ['MEMBER'],
};

function responsibility(
  overrides: Partial<ResponsibilityWithEvents> = {},
): ResponsibilityWithEvents {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    kind: ResponsibilityKind.OPPORTUNITY_DECISION,
    objective: 'Decide the next step for a verified opportunity',
    status: ResponsibilityStatus.ACTIVE,
    contextType: ResponsibilityContextType.PERSONAL,
    principalUserId: caller.id,
    principalOrganizationId: null,
    originConversationId: '22222222-2222-4222-8222-222222222222',
    originOpportunityId: '33333333-3333-4333-8333-333333333333',
    successCriteria: { type: 'OPPORTUNITY_DECISION_RECORDED' },
    authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
    authorityPolicyVersion: 'responsibility-guidance-v1',
    privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
    privacyPolicyVersion: 'personal-private-v1',
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    events: [],
    ...overrides,
  };
}

describe('ResponsibilitiesService', () => {
  const repo: jest.Mocked<IResponsibilityRepository> = {
    findOpenOpportunityDecision: jest.fn(),
    createAccepted: jest.fn(),
    findPersonalById: jest.fn(),
    findPersonalByUser: jest.fn(),
    markWaitingOnUser: jest.fn(),
    completeWithEvidence: jest.fn(),
  };

  const conversations = {
    findById: jest.fn(),
  };
  const opportunities = {
    findById: jest.fn(),
  };
  const savedOpportunities = {
    findOne: jest.fn(),
  };

  let service: ResponsibilitiesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResponsibilitiesService(
      repo,
      conversations as never,
      opportunities as never,
      savedOpportunities as never,
    );

    conversations.findById.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      userId: caller.id,
    });
    opportunities.findById.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      title: 'Verified program',
      status: OpportunityStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      deletedAt: null,
      deadline: null,
    });
    repo.findOpenOpportunityDecision.mockResolvedValue(null);
  });

  it('accepts only server-owned PERSONAL/GUIDANCE_ONLY policy from a member-owned conversation and verified opportunity', async () => {
    const created = responsibility();
    repo.createAccepted.mockResolvedValue(created);

    const result = await service.accept(
      {
        conversationId: '22222222-2222-4222-8222-222222222222',
        opportunityId: '33333333-3333-4333-8333-333333333333',
      },
      caller,
    );

    expect(repo.createAccepted).toHaveBeenCalledWith({
      principalUserId: caller.id,
      objective: 'Decide the next step for Verified program',
      originConversationId: '22222222-2222-4222-8222-222222222222',
      originOpportunityId: '33333333-3333-4333-8333-333333333333',
    });
    expect(result.contextType).toBe(ResponsibilityContextType.PERSONAL);
    expect(result.authorityClass).toBe(ResponsibilityAuthorityClass.GUIDANCE_ONLY);
    expect(result.privacyScope).toBe(ResponsibilityPrivacyScope.PERSONAL_PRIVATE);
  });

  it('fails closed without revealing another member conversation as valid provenance', async () => {
    conversations.findById.mockRejectedValue(
      new ForbiddenException('You may only access your own conversations'),
    );

    await expect(
      service.accept(
        {
          conversationId: '99999999-9999-4999-8999-999999999999',
          opportunityId: '33333333-3333-4333-8333-333333333333',
        },
        caller,
      ),
    ).rejects.toThrow(new NotFoundException('Conversation not found'));

    expect(opportunities.findById).not.toHaveBeenCalled();
    expect(repo.createAccepted).not.toHaveBeenCalled();
  });

  it('refuses an inactive or unverified opportunity', async () => {
    opportunities.findById.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      title: 'Stale program',
      status: OpportunityStatus.DRAFT,
      verificationStatus: VerificationStatus.PENDING_REVIEW,
      deletedAt: null,
      deadline: null,
    });

    await expect(
      service.accept(
        {
          conversationId: '22222222-2222-4222-8222-222222222222',
          opportunityId: '33333333-3333-4333-8333-333333333333',
        },
        caller,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repo.createAccepted).not.toHaveBeenCalled();
  });

  it('returns an existing open decision responsibility instead of duplicating the commitment', async () => {
    const existing = responsibility();
    repo.findOpenOpportunityDecision.mockResolvedValue(existing);

    const result = await service.accept(
      {
        conversationId: '22222222-2222-4222-8222-222222222222',
        opportunityId: '33333333-3333-4333-8333-333333333333',
      },
      caller,
    );

    expect(result.id).toBe(existing.id);
    expect(repo.createAccepted).not.toHaveBeenCalled();
  });

  it('moves ACTIVE work to WAITING_ON_USER when no concrete saved-opportunity decision exists', async () => {
    const current = responsibility();
    const waiting = responsibility({
      status: ResponsibilityStatus.WAITING_ON_USER,
      events: [
        {
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          responsibilityId: current.id,
          type: ResponsibilityEventType.USER_INPUT_REQUIRED,
          actorClass: ResponsibilityActorClass.AUREUS,
          actorUserId: null,
          fromStatus: ResponsibilityStatus.ACTIVE,
          toStatus: ResponsibilityStatus.WAITING_ON_USER,
          sourceSystem: null,
          sourceRecordType: null,
          sourceRecordId: null,
          sourceState: null,
          evidenceLevel: null,
          occurredAt: NOW,
        },
      ],
    });
    repo.findPersonalById.mockResolvedValue(current);
    savedOpportunities.findOne.mockResolvedValue(null);
    repo.markWaitingOnUser.mockResolvedValue(waiting);

    const result = await service.reconcile(current.id, caller);

    expect(repo.markWaitingOnUser).toHaveBeenCalledWith(current.id, caller.id);
    expect(result.status).toBe(ResponsibilityStatus.WAITING_ON_USER);
  });

  it('does not duplicate USER_INPUT_REQUIRED when already waiting on the member', async () => {
    const current = responsibility({ status: ResponsibilityStatus.WAITING_ON_USER });
    repo.findPersonalById.mockResolvedValue(current);
    savedOpportunities.findOne.mockResolvedValue({
      id: 'saved-1',
      trackingStatus: TrackingStatus.SAVED,
    });

    const result = await service.reconcile(current.id, caller);

    expect(result.status).toBe(ResponsibilityStatus.WAITING_ON_USER);
    expect(repo.markWaitingOnUser).not.toHaveBeenCalled();
  });

  it('completes the narrow decision criterion from member-reported saved-opportunity state without overclaiming external success', async () => {
    const current = responsibility({ status: ResponsibilityStatus.WAITING_ON_USER });
    const completed = responsibility({
      status: ResponsibilityStatus.COMPLETED,
      completedAt: NOW,
    });
    repo.findPersonalById.mockResolvedValue(current);
    savedOpportunities.findOne.mockResolvedValue({
      id: 'saved-1',
      trackingStatus: TrackingStatus.APPLYING,
    });
    repo.completeWithEvidence.mockResolvedValue(completed);

    const result = await service.reconcile(current.id, caller);

    expect(repo.completeWithEvidence).toHaveBeenCalledWith(current.id, caller.id, {
      sourceSystem: 'OPPORTUNITY_ENGINE',
      sourceRecordType: 'SavedOpportunity',
      sourceRecordId: 'saved-1',
      sourceState: TrackingStatus.APPLYING,
      evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
    });
    expect(result.status).toBe(ResponsibilityStatus.COMPLETED);
  });

  it('is idempotent after completion and does not append new evidence', async () => {
    const completed = responsibility({
      status: ResponsibilityStatus.COMPLETED,
      completedAt: NOW,
    });
    repo.findPersonalById.mockResolvedValue(completed);

    const result = await service.reconcile(completed.id, caller);

    expect(result.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(savedOpportunities.findOne).not.toHaveBeenCalled();
    expect(repo.completeWithEvidence).not.toHaveBeenCalled();
  });

  it('returns not found for a responsibility outside the caller personal scope', async () => {
    repo.findPersonalById.mockResolvedValue(null);

    await expect(service.findOne('other-responsibility', caller)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
