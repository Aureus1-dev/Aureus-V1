import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { StewardshipEscalation, StewardshipEscalationSeverity, StewardshipEscalationStatus, UserRole } from '@prisma/client';
import { PodEscalationsService } from './pod-escalations.service';
import { IStewardshipEscalationRepository, STEWARDSHIP_ESCALATION_REPOSITORY } from '../../stewardship/escalations/repositories/stewardship-escalation.repository.interface';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const OUTSIDER: AuthenticatedUser = { id: 'outsider-001', email: 'o@example.com', roles: [UserRole.MEMBER] };

const makeEscalation = (o: Partial<StewardshipEscalation> = {}): StewardshipEscalation => ({
  id: 'esc-001', relationshipId: null, podId: 'pod-001', title: 'Concern about a Steward',
  description: 'A member raised a confidential concern about how meetings are being run.',
  severity: StewardshipEscalationSeverity.MEDIUM, status: StewardshipEscalationStatus.OPEN,
  raisedById: MEMBER.id, resolvedById: null, resolutionNotes: null, createdAt: NOW, resolvedAt: null, ...o,
});

const mockRepo: jest.Mocked<IStewardshipEscalationRepository> = {
  create: jest.fn(), findById: jest.fn(), findByRelationship: jest.fn(), findByPod: jest.fn(),
  update: jest.fn(), countByStewardAndStatus: jest.fn(),
};
const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};

describe('PodEscalationsService — confidential care-request, never an accusation (Founder Decision #4)', () => {
  let service: PodEscalationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodEscalationsService,
        PodAuthorizationService,
        { provide: STEWARDSHIP_ESCALATION_REPOSITORY, useValue: mockRepo },
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
      ],
    }).compile();
    service = m.get(PodEscalationsService);
    jest.clearAllMocks();
  });

  it('allows any active Pod member — not only the Steward — to raise a concern, including about the Steward themselves', async () => {
    mockMembershipRepo.isActiveMember.mockResolvedValue(true);
    mockRepo.create.mockResolvedValue(makeEscalation());
    const result = await service.create('pod-001', { title: 'Concern about a Steward', description: 'A member raised a confidential concern about how meetings are being run.' }, MEMBER);
    expect(result.raisedById).toBe(MEMBER.id);
    const createCall = mockRepo.create.mock.calls[0][0];
    expect(createCall.podId).toBe('pod-001');
    expect(createCall.relationshipId).toBeUndefined();
  });

  it('rejects a non-member from raising a concern about a Pod they do not belong to', async () => {
    mockMembershipRepo.isActiveMember.mockResolvedValue(false);
    await expect(service.create('pod-001', { title: 'X', description: 'Some long enough description here' }, OUTSIDER)).rejects.toThrow(ForbiddenException);
  });

  it('restricts reading escalations to the Steward/Admin — never the general membership', async () => {
    mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
    await expect(service.findForPod('pod-001', MEMBER)).rejects.toThrow(ForbiddenException);
  });

  it('allows the Steward to review escalations for their own Pod', async () => {
    mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
    mockRepo.findByPod.mockResolvedValue([makeEscalation()]);
    const result = await service.findForPod('pod-001', STEWARD);
    expect(result).toHaveLength(1);
  });
});
