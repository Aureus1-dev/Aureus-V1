import { Module } from '@nestjs/common';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { PrismaMilestoneRepository } from './repositories/prisma-milestone.repository';
import { MILESTONE_REPOSITORY } from './repositories/milestone.repository.interface';

@Module({
  controllers: [MilestonesController],
  providers: [MilestonesService, { provide: MILESTONE_REPOSITORY, useClass: PrismaMilestoneRepository }],
  exports: [MilestonesService],
})
export class MilestonesModule {}
