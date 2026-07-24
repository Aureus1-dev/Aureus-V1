import { Injectable } from '@nestjs/common';
import { StatedNeed } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStatedNeedInput, IStatedNeedRepository } from './stated-need.repository.interface';

@Injectable()
export class PrismaStatedNeedRepository implements IStatedNeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateStatedNeedInput): Promise<StatedNeed> {
    return this.prisma.db.statedNeed.create({ data });
  }

  async findAllByUser(userId: string): Promise<StatedNeed[]> {
    return this.prisma.db.statedNeed.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<StatedNeed | null> {
    return this.prisma.db.statedNeed.findUnique({ where: { id } });
  }
}
