import { Injectable } from '@nestjs/common';
import { Milestone } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMilestoneInput,
  IMilestoneRepository,
  MilestonePaginationParams,
  PaginatedMilestones,
  UpdateMilestoneInput,
} from './milestone.repository.interface';

@Injectable()
export class PrismaMilestoneRepository implements IMilestoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMilestoneInput): Promise<Milestone> {
    return this.prisma.db.milestone.create({ data });
  }

  async findById(id: string): Promise<Milestone | null> {
    return this.prisma.db.milestone.findFirst({ where: { id, deletedAt: null } });
  }

  async findAll({
    page, limit, journeyId, status,
  }: MilestonePaginationParams): Promise<PaginatedMilestones> {
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      ...(journeyId !== undefined && { journeyId }),
      ...(status !== undefined && { status }),
    };
    const [data, total] = await Promise.all([
      this.prisma.db.milestone.findMany({
        where, skip, take: limit,
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.db.milestone.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateMilestoneInput): Promise<Milestone> {
    return this.prisma.db.milestone.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Milestone> {
    return this.prisma.db.milestone.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
