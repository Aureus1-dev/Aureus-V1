import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { PrismaConsentRepository } from './repositories/prisma-consent.repository';
import { CONSENT_REPOSITORY } from './repositories/consent.repository.interface';

@Module({
  imports: [AuthGuardsModule],
  controllers: [ConsentController],
  providers: [ConsentService, { provide: CONSENT_REPOSITORY, useClass: PrismaConsentRepository }],
  // Exported so Stewardship (B7 — steward visibility into arrival state)
  // can read a member's consent status without duplicating this logic.
  exports: [ConsentService],
})
export class ConsentModule {}
