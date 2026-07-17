import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AiModule } from '../ai/ai.module';

import { StewardActivityLogController } from './activity/steward-activity-log.controller';
import { StewardActivityLogService } from './activity/steward-activity-log.service';
import { PrismaStewardActivityLogRepository } from './activity/repositories/prisma-steward-activity-log.repository';
import { STEWARD_ACTIVITY_LOG_REPOSITORY } from './activity/repositories/steward-activity-log.repository.interface';

import { ConnectedAccountProviderModule } from './accounts/providers/connected-account-provider.module';
import { ConnectedAccountsController } from './accounts/connected-accounts.controller';
import { ConnectedAccountsService } from './accounts/connected-accounts.service';
import { PrismaConnectedAccountRepository } from './accounts/repositories/prisma-connected-account.repository';
import { CONNECTED_ACCOUNT_REPOSITORY } from './accounts/repositories/connected-account.repository.interface';

import { DocumentsController } from './documents/documents.controller';
import { DocumentsService } from './documents/documents.service';
import { PrismaDocumentRepository } from './documents/repositories/prisma-document.repository';
import { DOCUMENT_REPOSITORY } from './documents/repositories/document.repository.interface';

/**
 * Connected Experiences (DOMAIN-008, PA-018, FPB-009). Documents are fully
 * real (no third party required). ConnectedAccounts are architecturally
 * complete but stub-backed until real provider credentials exist — connect
 * never fabricates a successful connection. StewardActivityLogService is
 * shared by both sub-domains as the single audit trail.
 */
@Module({
  imports: [AuthGuardsModule, AiModule, ConnectedAccountProviderModule],
  controllers: [StewardActivityLogController, ConnectedAccountsController, DocumentsController],
  providers: [
    StewardActivityLogService,
    { provide: STEWARD_ACTIVITY_LOG_REPOSITORY, useClass: PrismaStewardActivityLogRepository },
    ConnectedAccountsService,
    { provide: CONNECTED_ACCOUNT_REPOSITORY, useClass: PrismaConnectedAccountRepository },
    DocumentsService,
    { provide: DOCUMENT_REPOSITORY, useClass: PrismaDocumentRepository },
  ],
})
export class ConnectedExperiencesModule {}
