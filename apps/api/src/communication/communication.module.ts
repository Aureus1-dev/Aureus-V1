import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { StewardshipModule } from '../stewardship/stewardship.module';
import { EmailModule } from '../email/email.module';

import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { PrismaNotificationRepository } from './notifications/repositories/prisma-notification.repository';
import { NOTIFICATION_REPOSITORY } from './notifications/repositories/notification.repository.interface';
import { PrismaNotificationDeliveryRepository } from './notifications/repositories/prisma-notification-delivery.repository';
import { NOTIFICATION_DELIVERY_REPOSITORY } from './notifications/repositories/notification-delivery.repository.interface';

import { NotificationPreferencesController } from './preferences/notification-preferences.controller';
import { NotificationPreferencesService } from './preferences/notification-preferences.service';
import { PrismaNotificationPreferenceRepository } from './preferences/repositories/prisma-notification-preference.repository';
import { NOTIFICATION_PREFERENCE_REPOSITORY } from './preferences/repositories/notification-preference.repository.interface';

import { AnnouncementsController } from './announcements/announcements.controller';
import { AnnouncementsService } from './announcements/announcements.service';
import { PrismaAnnouncementRepository } from './announcements/repositories/prisma-announcement.repository';
import { ANNOUNCEMENT_REPOSITORY } from './announcements/repositories/announcement.repository.interface';

import { ConversationsController } from './messaging/conversations.controller';
import { ConversationsService } from './messaging/conversations.service';
import { PrismaConversationRepository } from './messaging/repositories/prisma-conversation.repository';
import { CONVERSATION_REPOSITORY } from './messaging/repositories/conversation.repository.interface';
import { PrismaMessageRepository } from './messaging/repositories/prisma-message.repository';
import { MESSAGE_REPOSITORY } from './messaging/repositories/message.repository.interface';

@Module({
  imports: [AuthGuardsModule, UsersModule, OrganizationsModule, StewardshipModule, EmailModule],
  controllers: [
    NotificationsController,
    NotificationPreferencesController,
    AnnouncementsController,
    ConversationsController,
  ],
  providers: [
    NotificationsService,
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    { provide: NOTIFICATION_DELIVERY_REPOSITORY, useClass: PrismaNotificationDeliveryRepository },
    NotificationPreferencesService,
    { provide: NOTIFICATION_PREFERENCE_REPOSITORY, useClass: PrismaNotificationPreferenceRepository },
    AnnouncementsService,
    { provide: ANNOUNCEMENT_REPOSITORY, useClass: PrismaAnnouncementRepository },
    ConversationsService,
    { provide: CONVERSATION_REPOSITORY, useClass: PrismaConversationRepository },
    { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository },
  ],
  exports: [
    NotificationsService,
    NOTIFICATION_REPOSITORY,
  ],
})
export class CommunicationModule {}
