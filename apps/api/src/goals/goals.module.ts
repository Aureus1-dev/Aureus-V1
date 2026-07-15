import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { PrismaGoalRepository } from './repositories/prisma-goal.repository';
import { GOAL_REPOSITORY } from './repositories/goal.repository.interface';

@Module({
  imports: [AuthGuardsModule],
  controllers: [GoalsController],
  providers: [GoalsService, { provide: GOAL_REPOSITORY, useClass: PrismaGoalRepository }],
  exports: [GoalsService, GOAL_REPOSITORY],
})
export class GoalsModule {}
