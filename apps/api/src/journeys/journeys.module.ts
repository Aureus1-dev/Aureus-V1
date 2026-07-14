import { Module } from '@nestjs/common';
import { JourneysController } from './journeys.controller';
import { JourneysService } from './journeys.service';
import { PrismaJourneyRepository } from './repositories/prisma-journey.repository';
import { JOURNEY_REPOSITORY } from './repositories/journey.repository.interface';

@Module({
  controllers: [JourneysController],
  providers: [JourneysService, { provide: JOURNEY_REPOSITORY, useClass: PrismaJourneyRepository }],
  exports: [JourneysService],
})
export class JourneysModule {}
