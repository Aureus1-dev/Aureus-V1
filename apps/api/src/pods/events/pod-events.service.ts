import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PodEventStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RsvpDto } from './dto/rsvp.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { EventResponseDto, PrefillDefaultsResponseDto, RsvpResponseDto } from './dto/event-response.dto';
import { IPodEventRepository, POD_EVENT_REPOSITORY } from './repositories/pod-event.repository.interface';
import { IPodMeetingScheduleRepository, POD_MEETING_SCHEDULE_REPOSITORY } from '../meeting-schedule/repositories/pod-meeting-schedule.repository.interface';

@Injectable()
export class PodEventsService {
  constructor(
    @Inject(POD_EVENT_REPOSITORY) private readonly repo: IPodEventRepository,
    @Inject(POD_MEETING_SCHEDULE_REPOSITORY) private readonly scheduleRepo: IPodMeetingScheduleRepository,
    private readonly auth: PodAuthorizationService,
  ) {}

  /**
   * Intelligent prefill (Founder Decision #10): pulls the Pod's stored
   * cadence/location/durationMinutes defaults so a Steward can create the
   * next meeting in one step. The Steward always reviews, edits as needed,
   * and publishes — nothing here creates a PodEvent on its own.
   */
  async getPrefillDefaults(podId: string, caller: AuthenticatedUser): Promise<PrefillDefaultsResponseDto> {
    await this.auth.assertStewardOrAdmin(podId, caller);
    const schedule = await this.scheduleRepo.findByPod(podId);
    if (!schedule) return { suggestedStartsAt: null, location: null, durationMinutes: null };

    return {
      suggestedStartsAt: this.nextOccurrence(schedule.dayOfWeek, schedule.timeOfDay)?.toISOString() ?? null,
      location: schedule.location,
      durationMinutes: schedule.durationMinutes,
    };
  }

  async create(podId: string, dto: CreateEventDto, caller: AuthenticatedUser): Promise<EventResponseDto> {
    await this.auth.assertStewardOrAdmin(podId, caller);
    const event = await this.repo.create({
      podId,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      location: dto.location,
      createdById: caller.id,
    });
    return EventResponseDto.fromEntity(event);
  }

  async findForPod(podId: string, page: number, limit: number): Promise<{ data: EventResponseDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const result = await this.repo.findForPod({ page, limit, podId });
    return {
      data: result.data.map(EventResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<EventResponseDto> {
    const event = await this.getOrThrow(id);
    return EventResponseDto.fromEntity(event);
  }

  async update(id: string, dto: UpdateEventDto, caller: AuthenticatedUser): Promise<EventResponseDto> {
    const event = await this.getOrThrow(id);
    await this.auth.assertStewardOrAdmin(event.podId, caller);
    const updated = await this.repo.update(id, {
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    });
    return EventResponseDto.fromEntity(updated);
  }

  async cancel(id: string, caller: AuthenticatedUser): Promise<EventResponseDto> {
    const event = await this.getOrThrow(id);
    await this.auth.assertStewardOrAdmin(event.podId, caller);
    if (event.status !== PodEventStatus.SCHEDULED) {
      throw new ConflictException(`Only a SCHEDULED event can be cancelled (current status: '${event.status}')`);
    }
    const updated = await this.repo.update(id, { status: PodEventStatus.CANCELLED });
    return EventResponseDto.fromEntity(updated);
  }

  async complete(id: string, caller: AuthenticatedUser): Promise<EventResponseDto> {
    const event = await this.getOrThrow(id);
    await this.auth.assertStewardOrAdmin(event.podId, caller);
    const updated = await this.repo.update(id, { status: PodEventStatus.COMPLETED });
    return EventResponseDto.fromEntity(updated);
  }

  /** Any ACTIVE Pod member may RSVP to an upcoming event. */
  async rsvp(eventId: string, dto: RsvpDto, caller: AuthenticatedUser): Promise<void> {
    const event = await this.getOrThrow(eventId);
    await this.auth.assertActiveMemberOrAdmin(event.podId, caller);
    await this.repo.upsertRsvp(eventId, caller.id, dto.response);
  }

  /** Upcoming RSVPs are visible to fellow Pod members (Founder Decision #5) — this endpoint never exposes historical `attended`. */
  async findUpcomingRsvps(eventId: string, caller: AuthenticatedUser): Promise<RsvpResponseDto[]> {
    const event = await this.getOrThrow(eventId);
    await this.auth.assertActiveMemberOrAdmin(event.podId, caller);
    const rsvps = await this.repo.findRsvpsForEvent(eventId);
    return rsvps.map((r) => RsvpResponseDto.fromEntity({ userId: r.userId, response: r.response }));
  }

  /** Steward-only, after the fact. Attendance is never a performance metric anywhere it is surfaced (Founder Decision #5). */
  async markAttendance(eventId: string, dto: MarkAttendanceDto, caller: AuthenticatedUser): Promise<void> {
    const event = await this.getOrThrow(eventId);
    await this.auth.assertStewardOrAdmin(event.podId, caller);
    await this.repo.setAttendance(eventId, dto.userId, dto.attended);
  }

  private async getOrThrow(id: string) {
    const event = await this.repo.findById(id);
    if (!event) throw new NotFoundException(`Pod event '${id}' not found`);
    return event;
  }

  /** Next date/time matching the schedule's dayOfWeek/timeOfDay, today or later. */
  private nextOccurrence(dayOfWeek: number | null, timeOfDay: string | null): Date | null {
    if (dayOfWeek === null || dayOfWeek === undefined) return null;
    const [hour, minute] = (timeOfDay ?? '19:00').split(':').map((n) => parseInt(n, 10));
    const now = new Date();
    const result = new Date(now);
    const diff = (dayOfWeek - now.getDay() + 7) % 7;
    result.setDate(now.getDate() + (diff === 0 && now.getHours() >= hour ? 7 : diff));
    result.setHours(hour || 0, minute || 0, 0, 0);
    return result;
  }
}
