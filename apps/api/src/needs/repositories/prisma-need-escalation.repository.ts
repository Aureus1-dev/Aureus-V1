import { Injectable } from '@nestjs/common';
import { NeedEscalation, NeedEscalationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateNeedEscalationInput,
  IStatedNeedEscalationRepository,
} from './need-escalation.repository.interface';

@Injectable()
export class PrismaNeedEscalationRepository implements IStatedNeedEscalationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNeedEscalationInput): Promise<NeedEscalation> {
    return this.prisma.db.needEscalation.create({ data });
  }

  async findById(id: string): Promise<NeedEscalation | null> {
    return this.prisma.db.needEscalation.findUnique({ where: { id } });
  }

  async findAllByStatedNeed(statedNeedId: string): Promise<NeedEscalation[]> {
    return this.prisma.db.needEscalation.findMany({
      where: { statedNeedId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOpen(): Promise<NeedEscalation[]> {
    return this.prisma.db.needEscalation.findMany({
      where: {
        status: {
          in: [NeedEscalationStatus.PENDING, NeedEscalationStatus.ACKNOWLEDGED],
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async findOpenByUserIds(userIds: string[]): Promise<NeedEscalation[]> {
    if (userIds.length === 0) return [];
    return this.prisma.db.needEscalation.findMany({
      where: {
        userId: { in: userIds },
        status: {
          in: [NeedEscalationStatus.PENDING, NeedEscalationStatus.ACKNOWLEDGED],
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async acknowledge(id: string, acknowledgedById: string): Promise<NeedEscalation> {
    return this.prisma.db.needEscalation.update({
      where: { id },
      data: { status: NeedEscalationStatus.ACKNOWLEDGED, acknowledgedById, acknowledgedAt: new Date() },
    });
  }

  async resolve(id: string, resolvedById: string, resolutionNotes?: string): Promise<NeedEscalation> {
    return this.prisma.db.needEscalation.update({
      where: { id },
      data: {
        status: NeedEscalationStatus.RESOLVED,
        resolvedById,
        resolutionNotes,
        resolvedAt: new Date(),
      },
    });
  }
}
