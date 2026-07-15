import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { GoalsModule } from '../goals/goals.module';
import { JourneysController } from './journeys.controller';
import { JourneysService } from './journeys.service';
import { PrismaJourneyRepository } from './repositories/prisma-journey.repository';
import { JOURNEY_REPOSITORY } from './repositories/journey.repository.interface';

@Module({
  imports: [AuthGuardsModule, GoalsModule],
  controllers: [JourneysController],
  providers: [JourneysService, { provide: JOURNEY_REPOSITORY, useClass: PrismaJourneyRepository }],
  exports: [JourneysService, JOURNEY_REPOSITORY],
})
export class JourneysModule {}
