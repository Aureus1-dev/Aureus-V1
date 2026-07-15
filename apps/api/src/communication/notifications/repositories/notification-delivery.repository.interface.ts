import { DeliveryChannel, DeliveryStatus, NotificationDelivery } from '@prisma/client';

export const NOTIFICATION_DELIVERY_REPOSITORY = 'NOTIFICATION_DELIVERY_REPOSITORY';

export interface CreateDeliveryInput {
  notificationId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  deliveredAt?: Date;
}

export interface UpdateDeliveryInput {
  status?: DeliveryStatus;
  attempts?: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  failureReason?: string | null;
}

export interface INotificationDeliveryRepository {
  create(data: CreateDeliveryInput): Promise<NotificationDelivery>;
  findByNotificationAndChannel(notificationId: string, channel: DeliveryChannel): Promise<NotificationDelivery | null>;
  findByNotification(notificationId: string): Promise<NotificationDelivery[]>;
  update(id: string, data: UpdateDeliveryInput): Promise<NotificationDelivery>;
}
