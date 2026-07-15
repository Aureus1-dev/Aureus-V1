import { Injectable } from '@nestjs/common';
import { DeliveryChannel, NotificationDelivery } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDeliveryInput,
  INotificationDeliveryRepository,
  UpdateDeliveryInput,
} from './notification-delivery.repository.interface';

@Injectable()
export class PrismaNotificationDeliveryRepository implements INotificationDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDeliveryInput): Promise<NotificationDelivery> {
    return this.prisma.db.notificationDelivery.create({ data });
  }

  async findByNotificationAndChannel(notificationId: string, channel: DeliveryChannel): Promise<NotificationDelivery | null> {
    return this.prisma.db.notificationDelivery.findUnique({
      where: { notificationId_channel: { notificationId, channel } },
    });
  }

  async findByNotification(notificationId: string): Promise<NotificationDelivery[]> {
    return this.prisma.db.notificationDelivery.findMany({ where: { notificationId } });
  }

  async update(id: string, data: UpdateDeliveryInput): Promise<NotificationDelivery> {
    return this.prisma.db.notificationDelivery.update({ where: { id }, data });
  }
}
