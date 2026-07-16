import { Test } from '@nestjs/testing';
import { Pod, PodStatus, PodType } from '@prisma/client';
import { PodMatchingService } from './pod-matching.service';
import { IPodRepository, POD_REPOSITORY } from '../repositories/pod.repository.interface';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { IProfileRepository, PROFILE_REPOSITORY } from '../../users/profile/repositories/profile.repository.interface';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makePod = (o: Partial<Pod> = {}): Pod => ({
  id: 'pod-001', sequenceNumber: 1, podRef: 'AUR-POD-000001', name: 'Pod', shortDescription: 'S', fullDescription: 'F',
  type: PodType.HOME, status: PodStatus.ACTIVE, capacity: 12, primaryLanguage: null,
  city: null, region: null, stateProvince: null, country: null,
  dormancyThresholdDays: 60, parentPodId: null, createdById: 'u1', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockPodRepo: jest.Mocked<IPodRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(),
};
const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};
const mockProfileRepo: jest.Mocked<IProfileRepository> = {
  create: jest.fn(), findByUserId: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};

describe('PodMatchingService — deterministic scoring (§2.3), never autonomous', () => {
  let service: PodMatchingService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodMatchingService,
        { provide: POD_REPOSITORY, useValue: mockPodRepo },
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
        { provide: PROFILE_REPOSITORY, useValue: mockProfileRepo },
      ],
    }).compile();
    service = m.get(PodMatchingService);
    jest.clearAllMocks();
    mockMembershipRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 });
  });

  it('ranks a same-city Pod above a same-country-only Pod (proximity dominant)', async () => {
    mockProfileRepo.findByUserId.mockResolvedValue({
      id: 'p1', userId: 'u1', displayName: null, bio: null, avatarUrl: null,
      city: 'Austin', region: null, stateProvince: 'Texas', country: 'United States', localAreaDescription: null,
      profession: null, seasonOfLife: null, availabilityNotes: null, preferredLanguage: null, faithPreference: null,
      createdAt: NOW, updatedAt: NOW, deletedAt: null,
    } as never);
    mockPodRepo.findAll.mockResolvedValue({
      data: [
        makePod({ id: 'pod-far', country: 'United States' }),
        makePod({ id: 'pod-near', city: 'Austin' }),
      ],
      total: 2, page: 1, limit: 200,
    });

    const result = await service.rankCandidates('u1', PodType.HOME, 10);

    expect(result[0].pod.id).toBe('pod-near');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('excludes Pods the member already has a pending or active membership in', async () => {
    mockProfileRepo.findByUserId.mockResolvedValue(null);
    mockMembershipRepo.findAll.mockResolvedValue({
      data: [{ id: 'm1', podId: 'pod-001', userId: 'u1', role: 'MEMBER', status: 'ACTIVE', origin: 'MEMBER_REQUEST', invitedById: null, joinedAt: NOW, endedAt: null, endReason: null, createdAt: NOW, updatedAt: NOW } as never],
      total: 1, page: 1, limit: 200,
    });
    mockPodRepo.findAll.mockResolvedValue({ data: [makePod({ id: 'pod-001' })], total: 1, page: 1, limit: 200 });

    const result = await service.rankCandidates('u1', PodType.HOME, 10);
    expect(result).toHaveLength(0);
  });

  it('never excludes a candidate for missing optional profile data — a null profile still scores a baseline', async () => {
    mockProfileRepo.findByUserId.mockResolvedValue(null);
    mockPodRepo.findAll.mockResolvedValue({ data: [makePod()], total: 1, page: 1, limit: 200 });
    const result = await service.rankCandidates('u1', PodType.HOME, 10);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeGreaterThan(0);
  });
});
