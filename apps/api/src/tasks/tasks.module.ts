import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaTaskRepository } from './repositories/prisma-task.repository';
import { TASK_REPOSITORY } from './repositories/task.repository.interface';

@Module({
  imports: [AuthGuardsModule, MilestonesModule],
  controllers: [TasksController],
  providers: [TasksService, { provide: TASK_REPOSITORY, useClass: PrismaTaskRepository }],
  exports: [TasksService, TASK_REPOSITORY],
})
export class TasksModule {}
