import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { PrismaResponsibilityRepository } from './repositories/prisma-responsibility.repository';
import { RESPONSIBILITY_REPOSITORY } from './repositories/responsibility.repository.interface';
import { ResponsibilitiesController } from './responsibilities.controller';
import { ResponsibilitiesService } from './responsibilities.service';

@Module({
  imports: [AuthGuardsModule, AiModule, OpportunitiesModule],
  controllers: [ResponsibilitiesController],
  providers: [
    ResponsibilitiesService,
    {
      provide: RESPONSIBILITY_REPOSITORY,
      useClass: PrismaResponsibilityRepository,
    },
  ],
  exports: [ResponsibilitiesService, RESPONSIBILITY_REPOSITORY],
})
export class ResponsibilitiesModule {}
