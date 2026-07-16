import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ServiceProjectStatus, UserRole } from '@prisma/client';
import { PodMetricsService } from './pod-metrics.service';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { IPodEventRepository, POD_EVENT_REPOSITORY } from '../events/repositories/pod-event.repository.interface';
import { IPodServiceProjectRepository, POD_SERVICE_PROJECT_REPOSITORY } from '../service-projects/repositories/pod-service-project.repository.interface';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };

const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};
const mockEventRepo: jest.Mocked<IPodEventRepository> = {
  create: jest.fn(), findById: jest.fn(), findForPod: jest.fn(), countHeldSince: jest.fn(), countByPodAndStatus: jest.fn(),
  update: jest.fn(), upsertRsvp: jest.fn(), setAttendance: jest.fn(), findRsvpsForEvent: jest.fn(), countAttendanceForPod: jest.fn(),
};
const mockServiceProjectRepo: jest.Mocked<IPodServiceProjectRepository> = {
  create: jest.fn(), findById: jest.fn(), findForPod: jest.fn(), update: jest.fn(),
  countByPodAndStatus: jest.fn(), countForPod: jest.fn(),
};

describe('PodMetricsService — aggregate, Pod-level only, never per-member (§1.10, §6)', () => {
  let service: PodMetricsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodMetricsService,
        PodAuthorizationService,
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
        { provide: POD_EVENT_REPOSITORY, useValue: mockEventRepo },
        { provide: POD_SERVICE_PROJECT_REPOSITORY, useValue: mockServiceProjectRepo },
      ],
    }).compile();
    service = m.get(PodMetricsService);
    jest.clearAllMocks();
  });

  it('rejects a non-Steward, non-Admin caller', async () => {
    mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
    await expect(service.getForPod('pod-001', MEMBER)).rejects.toThrow(ForbiddenException);
  });

  it('returns null attendance rate rather than a misleading 0% when no data exists', async () => {
    mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
    mockMembershipRepo.countActiveForPod.mockResolvedValue(5);
    mockEventRepo.countAttendanceForPod.mockResolvedValue({ total: 0, attended: 0 });
    mockServiceProjectRepo.countForPod.mockResolvedValue(0);
    mockServiceProjectRepo.countByPodAndStatus.mockResolvedValue(0);
    mockEventRepo.countHeldSince.mockResolvedValue(0);

    const result = await service.getForPod('pod-001', STEWARD);
    expect(result.attendanceRatePercent).toBeNull();
    expect(result.activeMemberCount).toBe(5);
  });

  it('computes a rounded aggregate attendance percentage', async () => {
    mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
    mockMembershipRepo.countActiveForPod.mockResolvedValue(10);
    mockEventRepo.countAttendanceForPod.mockResolvedValue({ total: 20, attended: 15 });
    mockServiceProjectRepo.countForPod.mockResolvedValue(2);
    mockServiceProjectRepo.countByPodAndStatus.mockResolvedValue(ServiceProjectStatus.COMPLETED === ServiceProjectStatus.COMPLETED ? 1 : 0);
    mockEventRepo.countHeldSince.mockResolvedValue(4);

    const result = await service.getForPod('pod-001', STEWARD);
    expect(result.attendanceRatePercent).toBe(75);
  });

  it('computeRaw never enforces authorization — used only internally for AI Institutional Wisdom (§7.2)', async () => {
    mockMembershipRepo.countActiveForPod.mockResolvedValue(3);
    mockEventRepo.countAttendanceForPod.mockResolvedValue({ total: 0, attended: 0 });
    mockServiceProjectRepo.countForPod.mockResolvedValue(0);
    mockServiceProjectRepo.countByPodAndStatus.mockResolvedValue(0);
    mockEventRepo.countHeldSince.mockResolvedValue(0);
    await expect(service.computeRaw('pod-001')).resolves.toEqual(expect.objectContaining({ activeMemberCount: 3 }));
    expect(mockMembershipRepo.isActiveSteward).not.toHaveBeenCalled();
  });
});
