import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CitySheetModule } from '../city-sheet/city-sheet.module';
import { NeedsController } from './needs.controller';
import { NeedsService } from './needs.service';
import { PrismaStatedNeedRepository } from './repositories/prisma-stated-need.repository';
import { STATED_NEED_REPOSITORY } from './repositories/stated-need.repository.interface';
import { PrismaResourceOfferRepository } from './repositories/prisma-resource-offer.repository';
import { RESOURCE_OFFER_REPOSITORY } from './repositories/resource-offer.repository.interface';

@Module({
  imports: [AuthGuardsModule, CitySheetModule],
  controllers: [NeedsController],
  providers: [
    NeedsService,
    { provide: STATED_NEED_REPOSITORY, useClass: PrismaStatedNeedRepository },
    { provide: RESOURCE_OFFER_REPOSITORY, useClass: PrismaResourceOfferRepository },
  ],
  // Exported so the AI Conversations domain (Gate C — C1) can capture a
  // member's first message as a stated need without duplicating this logic.
  exports: [NeedsService],
})
export class NeedsModule {}
