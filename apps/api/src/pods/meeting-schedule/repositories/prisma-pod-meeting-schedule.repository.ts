import { Injectable } from '@nestjs/common';
import { PodMeetingSchedule } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPodMeetingScheduleRepository, UpsertScheduleInput } from './pod-meeting-schedule.repository.interface';

@Injectable()
export class PrismaPodMeetingScheduleRepository implements IPodMeetingScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPod(podId: string): Promise<PodMeetingSchedule | null> {
    return this.prisma.db.podMeetingSchedule.findUnique({ where: { podId } });
  }

  async upsert(data: UpsertScheduleInput): Promise<PodMeetingSchedule> {
    const { podId, ...rest } = data;
    return this.prisma.db.podMeetingSchedule.upsert({
      where: { podId },
      create: { podId, ...rest },
      update: rest,
    });
  }
}
