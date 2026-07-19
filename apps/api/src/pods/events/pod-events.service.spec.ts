import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PodEvent, PodEventStatus, PodEventType, RsvpResponse, UserRole } from '@prisma/client';
import { PodEventsService } from './pod-events.service';
import { IPodEventRepository, POD_EVENT_REPOSITORY } from './repositories/pod-event.repository.interface';
import { IPodMeetingScheduleRepository, POD_MEETING_SCHEDULE_REPOSITORY } from '../meeting-schedule/repositories/pod-meeting-schedule.repository.interface';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };

const makeEvent = (o: Partial<PodEvent> = {}): PodEvent => ({
  id: 'event-001', podId: 'pod-001', title: 'Weekly Gathering', description: null, type: PodEventType.MEETING,
  startsAt: NOW, endsAt: null, location: null, createdById: STEWARD.id, status: PodEventStatus.SCHEDULED,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const mockEventRepo: jest.Mocked<IPodEventRepository> = {
  create: jest.fn(), findById: jest.fn(), findForPod: jest.fn(), countHeldSince: jest.fn(), countByPodAndStatus: jest.fn(),
  update: jest.fn(), upsertRsvp: jest.fn(), setAttendance: jest.fn(), findRsvpsForEvent: jest.fn(), countAttendanceForPod: jest.fn(),
};
const mockScheduleRepo: jest.Mocked<IPodMeetingScheduleRepository> = { findByPod: jest.fn(), upsert: jest.fn() };
const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};

describe('PodEventsService', () => {
  let service: PodEventsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodEventsService,
        PodAuthorizationService,
        { provide: POD_EVENT_REPOSITORY, useValue: mockEventRepo },
        { provide: POD_MEETING_SCHEDULE_REPOSITORY, useValue: mockScheduleRepo },
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
      ],
    }).compile();
    service = m.get(PodEventsService);
    jest.clearAllMocks();
  });

  describe('create — always an intentional Steward act (Founder Decision #10)', () => {
    it('rejects a regular member creating an event', async () => {
      mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
      await expect(service.create('pod-001', { title: 'X', startsAt: NOW.toISOString() }, MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('allows the Pod Steward to create an event', async () => {
      mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
      mockEventRepo.create.mockResolvedValue(makeEvent());
      const result = await service.create('pod-001', { title: 'Weekly Gathering', startsAt: NOW.toISOString() }, STEWARD);
      expect(result.title).toBe('Weekly Gathering');
    });
  });

  describe('findForPod / findById — membership-gated (PD-001, previously unauthenticated)', () => {
    it('rejects a non-member listing a Pod\'s events', async () => {
      mockMembershipRepo.isActiveMember.mockResolvedValue(false);
      await expect(service.findForPod('pod-001', 1, 20, MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('allows an active member to list a Pod\'s events', async () => {
      mockMembershipRepo.isActiveMember.mockResolvedValue(true);
      mockEventRepo.findForPod.mockResolvedValue({ data: [makeEvent()], total: 1, page: 1, limit: 20 });
      const result = await service.findForPod('pod-001', 1, 20, MEMBER);
      expect(result.data).toHaveLength(1);
    });

    it('rejects a non-member reading a single event by id', async () => {
      mockEventRepo.findById.mockResolvedValue(makeEvent());
      mockMembershipRepo.isActiveMember.mockResolvedValue(false);
      await expect(service.findById('event-001', MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('allows an active member to read a single event by id', async () => {
      mockEventRepo.findById.mockResolvedValue(makeEvent());
      mockMembershipRepo.isActiveMember.mockResolvedValue(true);
      const result = await service.findById('event-001', MEMBER);
      expect(result.id).toBe('event-001');
    });
  });

  describe('rsvp / findUpcomingRsvps — visible to fellow members (Founder Decision #5)', () => {
    it('allows any active Pod member to RSVP', async () => {
      mockEventRepo.findById.mockResolvedValue(makeEvent());
      mockMembershipRepo.isActiveMember.mockResolvedValue(true);
      mockEventRepo.upsertRsvp.mockResolvedValue({} as never);
      await service.rsvp('event-001', { response: RsvpResponse.YES }, MEMBER);
      expect(mockEventRepo.upsertRsvp).toHaveBeenCalledWith('event-001', MEMBER.id, RsvpResponse.YES);
    });

    it('never returns attended in the upcoming-RSVP projection', async () => {
      mockEventRepo.findById.mockResolvedValue(makeEvent());
      mockMembershipRepo.isActiveMember.mockResolvedValue(true);
      mockEventRepo.findRsvpsForEvent.mockResolvedValue([
        { id: 'r1', eventId: 'event-001', userId: MEMBER.id, response: RsvpResponse.YES, attended: true, createdAt: NOW, updatedAt: NOW },
      ]);
      const result = await service.findUpcomingRsvps('event-001', MEMBER);
      expect(result[0]).not.toHaveProperty('attended');
    });
  });

  describe('markAttendance — Steward-only, never a performance metric (Founder Decision #5)', () => {
    it('rejects a regular member marking attendance', async () => {
      mockEventRepo.findById.mockResolvedValue(makeEvent());
      mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
      await expect(service.markAttendance('event-001', { userId: MEMBER.id, attended: true }, MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('allows the Steward to mark attendance after the fact', async () => {
      mockEventRepo.findById.mockResolvedValue(makeEvent());
      mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
      mockEventRepo.setAttendance.mockResolvedValue({} as never);
      await service.markAttendance('event-001', { userId: MEMBER.id, attended: true }, STEWARD);
      expect(mockEventRepo.setAttendance).toHaveBeenCalledWith('event-001', MEMBER.id, true);
    });
  });

  describe('cancel', () => {
    it('rejects cancelling a non-SCHEDULED event', async () => {
      mockEventRepo.findById.mockResolvedValue(makeEvent({ status: PodEventStatus.COMPLETED }));
      mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
      await expect(service.cancel('event-001', STEWARD)).rejects.toThrow(ConflictException);
    });
  });

  describe('getPrefillDefaults — informational only, never auto-generates (Founder Decision #10)', () => {
    it('returns null defaults when no schedule exists yet', async () => {
      mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
      mockScheduleRepo.findByPod.mockResolvedValue(null);
      const result = await service.getPrefillDefaults('pod-001', STEWARD);
      expect(result).toEqual({ suggestedStartsAt: null, location: null, durationMinutes: null });
    });
  });
});
