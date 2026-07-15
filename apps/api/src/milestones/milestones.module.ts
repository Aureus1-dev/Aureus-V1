import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { JourneysModule } from '../journeys/journeys.module';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { PrismaMilestoneRepository } from './repositories/prisma-milestone.repository';
import { MILESTONE_REPOSITORY } from './repositories/milestone.repository.interface';

@Module({
  imports: [AuthGuardsModule, JourneysModule],
  controllers: [MilestonesController],
  providers: [MilestonesService, { provide: MILESTONE_REPOSITORY, useClass: PrismaMilestoneRepository }],
  exports: [MilestonesService, MILESTONE_REPOSITORY],
})
export class MilestonesModule {}
