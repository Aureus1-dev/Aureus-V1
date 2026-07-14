import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaTaskRepository } from './repositories/prisma-task.repository';
import { TASK_REPOSITORY } from './repositories/task.repository.interface';

@Module({
  controllers: [TasksController],
  providers: [TasksService, { provide: TASK_REPOSITORY, useClass: PrismaTaskRepository }],
  exports: [TasksService],
})
export class TasksModule {}
