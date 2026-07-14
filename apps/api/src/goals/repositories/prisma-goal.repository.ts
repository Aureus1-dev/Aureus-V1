import { Injectable } from '@nestjs/common';
import { Goal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateGoalInput,
  GoalPaginationParams,
  IGoalRepository,
  PaginatedGoals,
  UpdateGoalInput,
} from './goal.repository.interface';

@Injectable()
export class PrismaGoalRepository implements IGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateGoalInput): Promise<Goal> {
    return this.prisma.db.goal.create({ data });
  }

  async findById(id: string): Promise<Goal | null> {
    return this.prisma.db.goal.findFirst({ where: { id, deletedAt: null } });
  }

  async findAll({ page, limit, userId, status }: GoalPaginationParams): Promise<PaginatedGoals> {
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      ...(userId !== undefined && { userId }),
      ...(status !== undefined && { status }),
    };
    const [data, total] = await Promise.all([
      this.prisma.db.goal.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.db.goal.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateGoalInput): Promise<Goal> {
    return this.prisma.db.goal.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Goal> {
    return this.prisma.db.goal.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
