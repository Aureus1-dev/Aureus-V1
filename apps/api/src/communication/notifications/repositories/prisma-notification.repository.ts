import { Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateNotificationInput,
  INotificationRepository,
  ListNotificationsQuery,
  PaginatedNotifications,
} from './notification.repository.interface';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationInput): Promise<Notification> {
    return this.prisma.db.notification.create({
      data: { ...data, data: data.data as Prisma.InputJsonValue },
    });
  }

  async findByDedupeKey(recipientId: string, dedupeKey: string): Promise<Notification | null> {
    return this.prisma.db.notification.findUnique({
      where: { recipientId_dedupeKey: { recipientId, dedupeKey } },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    return this.prisma.db.notification.findUnique({ where: { id } });
  }

  async findAll(query: ListNotificationsQuery): Promise<PaginatedNotifications> {
    const where: Prisma.NotificationWhereInput = {
      recipientId: query.recipientId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.unreadOnly ? { readAt: null } : {}),
      ...(query.includeArchived ? {} : { archivedAt: null }),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.db.notification.count({ where }),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  async markRead(id: string): Promise<Notification> {
    return this.prisma.db.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(recipientId: string): Promise<number> {
    const result = await this.prisma.db.notification.updateMany({
      where: { recipientId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async archive(id: string): Promise<Notification> {
    return this.prisma.db.notification.update({ where: { id }, data: { archivedAt: new Date() } });
  }
}
