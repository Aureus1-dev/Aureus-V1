import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CitySheetModule } from '../city-sheet/city-sheet.module';
import { CommunicationModule } from '../communication/communication.module';
import { UsersModule } from '../users/users.module';
import { NeedsController } from './needs.controller';
import { OnCallHoursController } from './on-call-hours.controller';
import { NeedsService } from './needs.service';
import { NeedEscalationsService } from './need-escalations.service';
import { PrismaStatedNeedRepository } from './repositories/prisma-stated-need.repository';
import { STATED_NEED_REPOSITORY } from './repositories/stated-need.repository.interface';
import { PrismaResourceOfferRepository } from './repositories/prisma-resource-offer.repository';
import { RESOURCE_OFFER_REPOSITORY } from './repositories/resource-offer.repository.interface';
import { PrismaNeedEscalationRepository } from './repositories/prisma-need-escalation.repository';
import { NEED_ESCALATION_REPOSITORY } from './repositories/need-escalation.repository.interface';
import { PrismaOnCallHoursRepository } from './repositories/prisma-on-call-hours.repository';
import { ON_CALL_HOURS_REPOSITORY } from './repositories/on-call-hours.repository.interface';
import { PrismaUnresolvedNeedRepository } from './repositories/prisma-unresolved-need.repository';
import { UNRESOLVED_NEED_REPOSITORY } from './repositories/unresolved-need.repository.interface';

@Module({
  imports: [AuthGuardsModule, CitySheetModule, CommunicationModule, UsersModule],
  controllers: [NeedsController, OnCallHoursController],
  providers: [
    NeedsService,
    NeedEscalationsService,
    { provide: STATED_NEED_REPOSITORY, useClass: PrismaStatedNeedRepository },
    { provide: RESOURCE_OFFER_REPOSITORY, useClass: PrismaResourceOfferRepository },
    { provide: NEED_ESCALATION_REPOSITORY, useClass: PrismaNeedEscalationRepository },
    { provide: ON_CALL_HOURS_REPOSITORY, useClass: PrismaOnCallHoursRepository },
    { provide: UNRESOLVED_NEED_REPOSITORY, useClass: PrismaUnresolvedNeedRepository },
  ],
  // OR-004 reuses the existing Needs domain as the source of truth beneath a
  // durable Responsibility. Exporting the orchestration services avoids a
  // second resource/escalation implementation while keeping their repositories
  // private to this module.
  exports: [NeedsService, NeedEscalationsService],
})
export class NeedsModule {}
