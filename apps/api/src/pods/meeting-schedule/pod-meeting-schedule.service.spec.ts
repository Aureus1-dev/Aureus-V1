import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { MeetingCadence, PodMeetingSchedule, UserRole } from '@prisma/client';
import { PodMeetingScheduleService } from './pod-meeting-schedule.service';
import { IPodMeetingScheduleRepository, POD_MEETING_SCHEDULE_REPOSITORY } from './repositories/pod-meeting-schedule.repository.interface';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };

const makeSchedule = (o: Partial<PodMeetingSchedule> = {}): PodMeetingSchedule => ({
  id: 'sched-001', podId: 'pod-001', cadence: MeetingCadence.BIWEEKLY, dayOfWeek: 4, timeOfDay: '19:00',
  location: 'Community Center', durationMinutes: 90, createdById: STEWARD.id, createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IPodMeetingScheduleRepository> = { findByPod: jest.fn(), upsert: jest.fn() };
const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};

describe('PodMeetingScheduleService — informational only, never auto-generates (Founder Decision #10)', () => {
  let service: PodMeetingScheduleService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodMeetingScheduleService,
        PodAuthorizationService,
        { provide: POD_MEETING_SCHEDULE_REPOSITORY, useValue: mockRepo },
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
      ],
    }).compile();
    service = m.get(PodMeetingScheduleService);
    jest.clearAllMocks();
  });

  it('rejects a non-Steward setting the schedule', async () => {
    mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
    await expect(service.upsert('pod-001', { cadence: MeetingCadence.WEEKLY }, MEMBER)).rejects.toThrow(ForbiddenException);
  });

  it('allows the Steward to set the schedule, storing prefill defaults (location, duration)', async () => {
    mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
    mockRepo.upsert.mockResolvedValue(makeSchedule());
    const result = await service.upsert('pod-001', { cadence: MeetingCadence.BIWEEKLY, location: 'Community Center', durationMinutes: 90 }, STEWARD);
    expect(result.location).toBe('Community Center');
    expect(result.durationMinutes).toBe(90);
  });

  // ── findForPod authorization (PD-001 — this endpoint had no guard at all) ──

  it('rejects a non-member reading the schedule', async () => {
    mockMembershipRepo.isActiveMember.mockResolvedValue(false);
    await expect(service.findForPod('pod-001', MEMBER)).rejects.toThrow(ForbiddenException);
  });

  it('allows an active member to read the schedule', async () => {
    mockMembershipRepo.isActiveMember.mockResolvedValue(true);
    mockRepo.findByPod.mockResolvedValue(makeSchedule());
    const result = await service.findForPod('pod-001', MEMBER);
    expect(result?.location).toBe('Community Center');
  });
});
