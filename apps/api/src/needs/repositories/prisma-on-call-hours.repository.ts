import { Injectable } from '@nestjs/common';
import { PublishedOnCallHours } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IOnCallHoursRepository, UpdateOnCallHoursInput } from './on-call-hours.repository.interface';

const SINGLETON_ID = 'singleton';

@Injectable()
export class PrismaOnCallHoursRepository implements IOnCallHoursRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(): Promise<PublishedOnCallHours> {
    return this.prisma.db.publishedOnCallHours.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
  }

  async update(data: UpdateOnCallHoursInput): Promise<PublishedOnCallHours> {
    return this.prisma.db.publishedOnCallHours.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, hoursDescription: data.hoursDescription, updatedById: data.updatedById },
      update: { hoursDescription: data.hoursDescription, updatedById: data.updatedById },
    });
  }
}
