import { Injectable } from '@nestjs/common';
import { StewardshipTask, StewardshipTaskStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateStewardshipTaskInput,
  IStewardshipTaskRepository,
  UpdateStewardshipTaskInput,
} from './stewardship-task.repository.interface';

@Injectable()
export class PrismaStewardshipTaskRepository implements IStewardshipTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateStewardshipTaskInput): Promise<StewardshipTask> {
    return this.prisma.db.stewardshipTask.create({ data });
  }

  async findById(id: string): Promise<StewardshipTask | null> {
    return this.prisma.db.stewardshipTask.findUnique({ where: { id } });
  }

  async findByRelationship(relationshipId: string): Promise<StewardshipTask[]> {
    return this.prisma.db.stewardshipTask.findMany({
      where: { relationshipId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateStewardshipTaskInput): Promise<StewardshipTask> {
    return this.prisma.db.stewardshipTask.update({ where: { id }, data });
  }

  async countByStewardAndStatus(stewardId: string, status: StewardshipTaskStatus): Promise<number> {
    return this.prisma.db.stewardshipTask.count({
      where: { status, relationship: { stewardId } },
    });
  }
}
