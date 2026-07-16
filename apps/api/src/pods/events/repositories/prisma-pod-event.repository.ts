import { Injectable } from '@nestjs/common';
import { PodEvent, PodEventRsvp, PodEventStatus, RsvpResponse } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateEventInput,
  EventQueryParams,
  IPodEventRepository,
  PaginatedEvents,
  UpdateEventInput,
} from './pod-event.repository.interface';

@Injectable()
export class PrismaPodEventRepository implements IPodEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEventInput): Promise<PodEvent> {
    return this.prisma.db.podEvent.create({ data });
  }

  async findById(id: string): Promise<PodEvent | null> {
    return this.prisma.db.podEvent.findUnique({ where: { id } });
  }

  async findForPod(params: EventQueryParams): Promise<PaginatedEvents> {
    const { page, limit, podId } = params;
    const skip = (page - 1) * limit;
    const where = { podId };
    const [data, total] = await Promise.all([
      this.prisma.db.podEvent.findMany({ where, skip, take: limit, orderBy: { startsAt: 'desc' } }),
      this.prisma.db.podEvent.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async countHeldSince(podId: string, since: Date): Promise<number> {
    return this.prisma.db.podEvent.count({
      where: { podId, status: PodEventStatus.COMPLETED, startsAt: { gte: since } },
    });
  }

  async countByPodAndStatus(podId: string, status: PodEventStatus): Promise<number> {
    return this.prisma.db.podEvent.count({ where: { podId, status } });
  }

  async update(id: string, data: UpdateEventInput): Promise<PodEvent> {
    return this.prisma.db.podEvent.update({ where: { id }, data });
  }

  async upsertRsvp(eventId: string, userId: string, response: RsvpResponse): Promise<PodEventRsvp> {
    return this.prisma.db.podEventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, response },
      update: { response },
    });
  }

  async setAttendance(eventId: string, userId: string, attended: boolean): Promise<PodEventRsvp> {
    return this.prisma.db.podEventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, response: RsvpResponse.YES, attended },
      update: { attended },
    });
  }

  async findRsvpsForEvent(eventId: string): Promise<PodEventRsvp[]> {
    return this.prisma.db.podEventRsvp.findMany({ where: { eventId } });
  }

  async countAttendanceForPod(podId: string): Promise<{ total: number; attended: number }> {
    const rsvps = await this.prisma.db.podEventRsvp.findMany({
      where: { event: { podId }, attended: { not: null } },
      select: { attended: true },
    });
    return { total: rsvps.length, attended: rsvps.filter((r) => r.attended).length };
  }
}
