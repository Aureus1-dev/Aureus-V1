import { Module } from '@nestjs/common';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { PrismaGoalRepository } from './repositories/prisma-goal.repository';
import { GOAL_REPOSITORY } from './repositories/goal.repository.interface';

@Module({
  controllers: [GoalsController],
  providers: [GoalsService, { provide: GOAL_REPOSITORY, useClass: PrismaGoalRepository }],
  exports: [GoalsService],
})
export class GoalsModule {}
