import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PodServiceProject, ServiceProjectStatus, UserRole } from '@prisma/client';
import { PodServiceProjectsService } from './pod-service-projects.service';
import { IPodServiceProjectRepository, POD_SERVICE_PROJECT_REPOSITORY } from './repositories/pod-service-project.repository.interface';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-002', email: 'm2@example.com', roles: [UserRole.MEMBER] };

const makeProject = (o: Partial<PodServiceProject> = {}): PodServiceProject => ({
  id: 'proj-001', podId: 'pod-001', title: 'Food Pantry', description: 'Who needs us?',
  status: ServiceProjectStatus.PROPOSED, proposedById: MEMBER.id, createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IPodServiceProjectRepository> = {
  create: jest.fn(), findById: jest.fn(), findForPod: jest.fn(), update: jest.fn(),
  countByPodAndStatus: jest.fn(), countForPod: jest.fn(),
};
const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};

describe('PodServiceProjectsService — Article IX "who needs us?"', () => {
  let service: PodServiceProjectsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodServiceProjectsService,
        PodAuthorizationService,
        { provide: POD_SERVICE_PROJECT_REPOSITORY, useValue: mockRepo },
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
      ],
    }).compile();
    service = m.get(PodServiceProjectsService);
    jest.clearAllMocks();
  });

  it('allows any active member (not only the Steward) to propose a project', async () => {
    mockMembershipRepo.isActiveMember.mockResolvedValue(true);
    mockRepo.create.mockResolvedValue(makeProject());
    const result = await service.create('pod-001', { title: 'Food Pantry', description: 'Who needs us?' }, MEMBER);
    expect(result.proposedById).toBe(MEMBER.id);
  });

  it('rejects a non-member from proposing', async () => {
    mockMembershipRepo.isActiveMember.mockResolvedValue(false);
    await expect(service.create('pod-001', { title: 'X', description: 'Y desc long enough' }, MEMBER)).rejects.toThrow(ForbiddenException);
  });

  it('allows the proposer to edit their own project without Steward status', async () => {
    mockRepo.findById.mockResolvedValue(makeProject({ proposedById: MEMBER.id }));
    mockRepo.update.mockResolvedValue(makeProject({ title: 'Updated' }));
    const result = await service.update('proj-001', { title: 'Updated' }, MEMBER);
    expect(result.title).toBe('Updated');
  });

  it('rejects a non-proposer, non-Steward member editing someone else\'s project', async () => {
    mockRepo.findById.mockResolvedValue(makeProject({ proposedById: OTHER_MEMBER.id }));
    mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
    await expect(service.update('proj-001', { title: 'X' }, MEMBER)).rejects.toThrow(ForbiddenException);
  });

  it('restricts status changes to the Pod Steward', async () => {
    mockRepo.findById.mockResolvedValue(makeProject());
    mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
    await expect(service.updateStatus('proj-001', { status: ServiceProjectStatus.ACTIVE }, MEMBER)).rejects.toThrow(ForbiddenException);
  });
});
