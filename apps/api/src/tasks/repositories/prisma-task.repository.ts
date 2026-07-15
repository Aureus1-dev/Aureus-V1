import { Injectable } from '@nestjs/common';
import { Task } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTaskInput,
  ITaskRepository,
  PaginatedTasks,
  TaskPaginationParams,
  UpdateTaskInput,
} from './task.repository.interface';

@Injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTaskInput): Promise<Task> {
    return this.prisma.db.task.create({ data });
  }

  async findById(id: string): Promise<Task | null> {
    return this.prisma.db.task.findFirst({ where: { id, deletedAt: null } });
  }

  async findAll({ page, limit, milestoneId, status, priority }: TaskPaginationParams): Promise<PaginatedTasks> {
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      ...(milestoneId !== undefined && { milestoneId }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
    };
    const [data, total] = await Promise.all([
      this.prisma.db.task.findMany({
        where, skip, take: limit,
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.db.task.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateTaskInput): Promise<Task> {
    return this.prisma.db.task.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Task> {
    return this.prisma.db.task.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async findOwnerId(id: string): Promise<string | null> {
    const task = await this.prisma.db.task.findFirst({
      where: { id, deletedAt: null },
      select: { milestone: { select: { journey: { select: { goal: { select: { userId: true } } } } } } },
    });
    return task?.milestone.journey.goal.userId ?? null;
  }
}
