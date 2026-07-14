import { Injectable } from '@nestjs/common';
import { Journey } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateJourneyInput,
  IJourneyRepository,
  UpdateJourneyInput,
} from './journey.repository.interface';

@Injectable()
export class PrismaJourneyRepository implements IJourneyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateJourneyInput): Promise<Journey> {
    return this.prisma.db.journey.create({ data });
  }

  async findById(id: string): Promise<Journey | null> {
    return this.prisma.db.journey.findFirst({ where: { id, deletedAt: null } });
  }

  async findByGoalId(goalId: string): Promise<Journey | null> {
    return this.prisma.db.journey.findFirst({ where: { goalId, deletedAt: null } });
  }

  async update(id: string, data: UpdateJourneyInput): Promise<Journey> {
    return this.prisma.db.journey.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Journey> {
    return this.prisma.db.journey.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
