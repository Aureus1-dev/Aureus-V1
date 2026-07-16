import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Pod, PodStatus, PodType, UserRole } from '@prisma/client';
import { PodsService } from './pods.service';
import { IPodRepository, POD_REPOSITORY } from './repositories/pod.repository.interface';
import { PodAuthorizationService } from './common/pod-authorization.service';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from './memberships/repositories/pod-membership.repository.interface';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makePod = (o: Partial<Pod> = {}): Pod => ({
  id: 'pod-001', sequenceNumber: 1, podRef: 'AUR-POD-000001',
  name: 'Riverside Home Pod', shortDescription: 'S', fullDescription: 'F',
  type: PodType.HOME, status: PodStatus.FORMING, capacity: 12, primaryLanguage: null,
  city: null, region: null, stateProvince: null, country: null,
  dormancyThresholdDays: 60, parentPodId: null,
  createdById: STEWARD.id, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<IPodRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(),
};
const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};

describe('PodsService', () => {
  let service: PodsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodsService,
        PodAuthorizationService,
        { provide: POD_REPOSITORY, useValue: mockRepo },
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
      ],
    }).compile();
    service = m.get(PodsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a Pod and assigns a sequence ref', async () => {
      mockRepo.create.mockResolvedValue(makePod({ podRef: null }));
      mockRepo.setRef.mockResolvedValue(makePod());
      const result = await service.create({ name: 'Riverside Home Pod', shortDescription: 'S', fullDescription: 'F', type: PodType.HOME }, STEWARD);
      expect(mockRepo.setRef).toHaveBeenCalledWith('pod-001', 'AUR-POD-000001');
      expect(result.podRef).toBe('AUR-POD-000001');
    });
  });

  describe('update', () => {
    it('allows this Pod\'s Steward to update it', async () => {
      mockRepo.findById.mockResolvedValue(makePod());
      mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
      mockRepo.update.mockResolvedValue(makePod({ name: 'New Name' }));
      const result = await service.update('pod-001', { name: 'New Name' }, STEWARD);
      expect(result.name).toBe('New Name');
    });

    it('rejects a non-Steward, non-Admin caller', async () => {
      mockRepo.findById.mockResolvedValue(makePod());
      mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
      await expect(service.update('pod-001', { name: 'X' }, MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing Pod', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('missing', {}, ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    it('moves FORMING to ACTIVE for the Steward', async () => {
      mockRepo.findById.mockResolvedValue(makePod({ status: PodStatus.FORMING }));
      mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
      mockRepo.update.mockResolvedValue(makePod({ status: PodStatus.ACTIVE }));
      const result = await service.activate('pod-001', STEWARD);
      expect(result.status).toBe(PodStatus.ACTIVE);
    });

    it('rejects activating an already-ARCHIVED Pod', async () => {
      mockRepo.findById.mockResolvedValue(makePod({ status: PodStatus.ARCHIVED }));
      mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
      await expect(service.activate('pod-001', STEWARD)).rejects.toThrow(ConflictException);
    });
  });

  describe('archive', () => {
    it('archives a Pod for an Admin regardless of Steward status', async () => {
      mockRepo.findById.mockResolvedValue(makePod({ status: PodStatus.ACTIVE }));
      mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue(makePod({ status: PodStatus.ARCHIVED }));
      const result = await service.archive('pod-001', ADMIN);
      expect(result.status).toBe(PodStatus.ARCHIVED);
    });

    it('rejects archiving an already-ARCHIVED Pod', async () => {
      mockRepo.findById.mockResolvedValue(makePod({ status: PodStatus.ARCHIVED }));
      await expect(service.archive('pod-001', ADMIN)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('defaults to ACTIVE-only listing', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll({});
      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ status: PodStatus.ACTIVE }));
    });
  });
});
