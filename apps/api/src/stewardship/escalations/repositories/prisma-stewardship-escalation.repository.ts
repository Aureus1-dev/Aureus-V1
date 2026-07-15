import { Injectable } from '@nestjs/common';
import { StewardshipEscalation, StewardshipEscalationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateEscalationInput,
  IStewardshipEscalationRepository,
  UpdateEscalationInput,
} from './stewardship-escalation.repository.interface';

@Injectable()
export class PrismaStewardshipEscalationRepository implements IStewardshipEscalationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEscalationInput): Promise<StewardshipEscalation> {
    return this.prisma.db.stewardshipEscalation.create({ data });
  }

  async findById(id: string): Promise<StewardshipEscalation | null> {
    return this.prisma.db.stewardshipEscalation.findUnique({ where: { id } });
  }

  async findByRelationship(relationshipId: string): Promise<StewardshipEscalation[]> {
    return this.prisma.db.stewardshipEscalation.findMany({
      where: { relationshipId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateEscalationInput): Promise<StewardshipEscalation> {
    return this.prisma.db.stewardshipEscalation.update({ where: { id }, data });
  }

  async countByStewardAndStatus(stewardId: string, statuses: StewardshipEscalationStatus[]): Promise<number> {
    return this.prisma.db.stewardshipEscalation.count({
      where: { status: { in: statuses }, relationship: { stewardId } },
    });
  }
}
