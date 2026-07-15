import { Injectable } from '@nestjs/common';
import { NotificationCategory, NotificationPreference } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  INotificationPreferenceRepository,
  UpsertPreferenceInput,
} from './notification-preference.repository.interface';

@Injectable()
export class PrismaNotificationPreferenceRepository implements INotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string): Promise<NotificationPreference[]> {
    return this.prisma.db.notificationPreference.findMany({ where: { userId } });
  }

  async findByUserAndCategory(userId: string, category: NotificationCategory): Promise<NotificationPreference | null> {
    return this.prisma.db.notificationPreference.findUnique({
      where: { userId_category: { userId, category } },
    });
  }

  async upsert(userId: string, category: NotificationCategory, data: UpsertPreferenceInput): Promise<NotificationPreference> {
    return this.prisma.db.notificationPreference.upsert({
      where: { userId_category: { userId, category } },
      create: { userId, category, ...data },
      update: data,
    });
  }
}
