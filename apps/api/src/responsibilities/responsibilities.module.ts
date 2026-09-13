import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { BusinessResponsibilitiesController } from './business-responsibilities.controller';
import { BusinessResponsibilitiesService } from './business-responsibilities.service';
import { PrismaResponsibilityRepository } from './repositories/prisma-responsibility.repository';
import { RESPONSIBILITY_REPOSITORY } from './repositories/responsibility.repository.interface';
import { ResponsibilitiesController } from './responsibilities.controller';
import { ResponsibilitiesService } from './responsibilities.service';

@Module({
  imports: [AuthGuardsModule, AiModule, OpportunitiesModule],
  controllers: [ResponsibilitiesController, BusinessResponsibilitiesController],
  providers: [
    ResponsibilitiesService,
    BusinessResponsibilitiesService,
    {
      provide: RESPONSIBILITY_REPOSITORY,
      useClass: PrismaResponsibilityRepository,
    },
  ],
  exports: [
    ResponsibilitiesService,
    BusinessResponsibilitiesService,
    RESPONSIBILITY_REPOSITORY,
  ],
})
export class ResponsibilitiesModule {}
