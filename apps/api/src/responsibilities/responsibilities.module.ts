import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CommunicationModule } from '../communication/communication.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { BusinessResponsibilityCommunicationsService } from './business-responsibility-communications.service';
import { BusinessResponsibilitiesController } from './business-responsibilities.controller';
import { BusinessResponsibilitiesService } from './business-responsibilities.service';
import { PrismaResponsibilityRepository } from './repositories/prisma-responsibility.repository';
import { RESPONSIBILITY_REPOSITORY } from './repositories/responsibility.repository.interface';
import { ResponsibilitiesController } from './responsibilities.controller';
import { ResponsibilitiesService } from './responsibilities.service';

@Module({
  imports: [AuthGuardsModule, AiModule, CommunicationModule, OpportunitiesModule],
  controllers: [ResponsibilitiesController, BusinessResponsibilitiesController],
  providers: [
    ResponsibilitiesService,
    BusinessResponsibilitiesService,
    BusinessResponsibilityCommunicationsService,
    {
      provide: RESPONSIBILITY_REPOSITORY,
      useClass: PrismaResponsibilityRepository,
    },
  ],
  exports: [
    ResponsibilitiesService,
    BusinessResponsibilitiesService,
    BusinessResponsibilityCommunicationsService,
    RESPONSIBILITY_REPOSITORY,
  ],
})
export class ResponsibilitiesModule {}
