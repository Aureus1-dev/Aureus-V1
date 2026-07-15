import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeliveryChannel, DeliveryStatus, Notification, NotificationCategory } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/communication-roles.util';
import { IEmailService, EMAIL_SERVICE } from '../../email/email.service.interface';
import { IUserRepository, USER_REPOSITORY } from '../../users/repositories/user.repository.interface';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from '../preferences/repositories/notification-preference.repository.interface';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginatedNotificationsResponseDto } from './dto/paginated-notifications-response.dto';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from './repositories/notification.repository.interface';
import {
  INotificationDeliveryRepository,
  NOTIFICATION_DELIVERY_REPOSITORY,
} from './repositories/notification-delivery.repository.interface';

/**
 * Input to the domain-integration entry point, `notify()`. Every field a
 * calling domain supplies; `data`/`actorId`/`dedupeKey`/`expiresAt` are
 * optional. `bypassPreferences` is reserved for the Announcements
 * sub-domain's `isCritical` flag (ADR-012 Decision 3) — no other caller
 * should set it.
 */
export interface NotifyInput {
  recipientId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  actorId?: string;
  dedupeKey?: string;
  expiresAt?: Date;
  bypassPreferences?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly repo: INotificationRepository,
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY) private readonly deliveryRepo: INotificationDeliveryRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY) private readonly prefRepo: INotificationPreferenceRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
  ) {}

  // ── Domain integration entry point ──────────────────────────────────────

  /**
   * Creates an in-app notification for `recipientId` and, where the
   * recipient's preferences allow it, attempts an email delivery. This is
   * the one public method every other domain (Stewardship, Business Portal,
   * Opportunity Engine, Resource Directory, Journey Engine, and — once
   * built — Pods, Academy, Document Intelligence, Knowledge System, AI
   * Intelligence Engine) is meant to call to send a communication, rather
   * than building its own delivery mechanism (ADR-012 §Domain Integration
   * Foundation). Idempotent when `dedupeKey` is supplied — a retried call
   * with the same (recipientId, dedupeKey) pair returns the original
   * notification rather than creating a duplicate.
   *
   * Returns `null` when the recipient has opted the category's in-app
   * channel off entirely — nothing is created, matching PA-015's "override
   * member communication preferences except for critical platform or
   * safety notifications" boundary (bypassed only when `bypassPreferences`
   * is set, or `category` is SYSTEM).
   */
  async notify(input: NotifyInput): Promise<NotificationResponseDto | null> {
    if (input.dedupeKey) {
      const existing = await this.repo.findByDedupeKey(input.recipientId, input.dedupeKey);
      if (existing) return NotificationResponseDto.fromEntity(existing);
    }

    const forced = input.category === NotificationCategory.SYSTEM || input.bypassPreferences === true;
    const pref = forced ? null : await this.prefRepo.findByUserAndCategory(input.recipientId, input.category);
    const inAppEnabled = forced ? true : (pref?.inAppEnabled ?? true);
    const emailEnabled = forced ? true : (pref?.emailEnabled ?? true);

    if (!inAppEnabled) return null;

    const created = await this.repo.create({
      recipientId: input.recipientId,
      category: input.category,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      actorId: input.actorId,
      dedupeKey: input.dedupeKey,
      expiresAt: input.expiresAt,
    });

    // In-app delivery is honest DELIVERED immediately: the row is created
    // and queryable the instant this transaction returns — there is no
    // separate transport step to fail.
    await this.deliveryRepo.create({
      notificationId: created.id,
      channel: DeliveryChannel.IN_APP,
      status: DeliveryStatus.DELIVERED,
      deliveredAt: new Date(),
    });

    if (emailEnabled) {
      await this.attemptEmailDelivery(created);
    } else {
      await this.deliveryRepo.create({ notificationId: created.id, channel: DeliveryChannel.EMAIL, status: DeliveryStatus.SKIPPED });
    }

    const deliveries = await this.deliveryRepo.findByNotification(created.id);
    return NotificationResponseDto.fromEntity(created, deliveries);
  }

  /**
   * Retry-ready: safe to call again for a notification whose email delivery
   * previously failed. A no-op once the channel has reached SENT
   * (idempotency — never double-sends).
   */
  async attemptEmailDelivery(notification: Notification): Promise<void> {
    const existing = await this.deliveryRepo.findByNotificationAndChannel(notification.id, DeliveryChannel.EMAIL);
    if (existing?.status === DeliveryStatus.SENT) return;

    const delivery = existing ?? await this.deliveryRepo.create({
      notificationId: notification.id, channel: DeliveryChannel.EMAIL, status: DeliveryStatus.PENDING,
    });

    const user = await this.userRepo.findById(notification.recipientId);
    if (!user) {
      await this.deliveryRepo.update(delivery.id, {
        status: DeliveryStatus.FAILED, attempts: delivery.attempts + 1, lastAttemptAt: new Date(), failureReason: 'Recipient not found',
      });
      return;
    }

    try {
      await this.emailService.sendNotification(user.email, notification.title, notification.body);
      await this.deliveryRepo.update(delivery.id, {
        status: DeliveryStatus.SENT, attempts: delivery.attempts + 1, lastAttemptAt: new Date(),
      });
    } catch (err) {
      this.logger.warn(`Email delivery failed for notification ${notification.id}: ${err instanceof Error ? err.message : 'unknown error'}`);
      await this.deliveryRepo.update(delivery.id, {
        status: DeliveryStatus.FAILED,
        attempts: delivery.attempts + 1,
        lastAttemptAt: new Date(),
        failureReason: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // ── Member-facing reads/actions ─────────────────────────────────────────

  async findById(id: string, caller: AuthenticatedUser): Promise<NotificationResponseDto> {
    const notification = await this.repo.findById(id);
    if (!notification) throw new NotFoundException(`Notification '${id}' not found`);
    this.assertOwnerOrAdmin(notification.recipientId, caller);
    const deliveries = await this.deliveryRepo.findByNotification(id);
    return NotificationResponseDto.fromEntity(notification, deliveries);
  }

  async findAll(query: ListNotificationsQueryDto, caller: AuthenticatedUser): Promise<PaginatedNotificationsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repo.findAll({
      page, limit, recipientId: caller.id,
      category: query.category, unreadOnly: query.unreadOnly, includeArchived: query.includeArchived,
    });
    return {
      data: result.data.map((n) => NotificationResponseDto.fromEntity(n)),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async markRead(id: string, caller: AuthenticatedUser): Promise<NotificationResponseDto> {
    const notification = await this.repo.findById(id);
    if (!notification) throw new NotFoundException(`Notification '${id}' not found`);
    this.assertOwnerOrAdmin(notification.recipientId, caller);
    const updated = await this.repo.markRead(id);
    return NotificationResponseDto.fromEntity(updated);
  }

  async markAllRead(caller: AuthenticatedUser): Promise<{ count: number }> {
    const count = await this.repo.markAllRead(caller.id);
    return { count };
  }

  async archive(id: string, caller: AuthenticatedUser): Promise<NotificationResponseDto> {
    const notification = await this.repo.findById(id);
    if (!notification) throw new NotFoundException(`Notification '${id}' not found`);
    this.assertOwnerOrAdmin(notification.recipientId, caller);
    const updated = await this.repo.archive(id);
    return NotificationResponseDto.fromEntity(updated);
  }

  private assertOwnerOrAdmin(recipientId: string, caller: AuthenticatedUser): void {
    if (caller.id === recipientId) return;
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    throw new ForbiddenException('You may only access your own notifications');
  }
}
