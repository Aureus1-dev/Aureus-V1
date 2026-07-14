import { Injectable } from '@nestjs/common';
import { SavedOpportunity } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateSavedInput,
  ISavedOpportunityRepository,
  UpdateSavedInput,
} from './saved-opportunity.repository.interface';

@Injectable()
export class PrismaSavedOpportunityRepository implements ISavedOpportunityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(data: CreateSavedInput): Promise<SavedOpportunity> {
    return this.prisma.db.savedOpportunity.create({ data });
  }

  async findByUser(userId: string): Promise<SavedOpportunity[]> {
    return this.prisma.db.savedOpportunity.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
    });
  }

  async findOne(userId: string, opportunityId: string): Promise<SavedOpportunity | null> {
    return this.prisma.db.savedOpportunity.findUnique({
      where: { userId_opportunityId: { userId, opportunityId } },
    });
  }

  async update(userId: string, opportunityId: string, data: UpdateSavedInput): Promise<SavedOpportunity> {
    return this.prisma.db.savedOpportunity.update({
      where: { userId_opportunityId: { userId, opportunityId } },
      data,
    });
  }

  async remove(userId: string, opportunityId: string): Promise<void> {
    await this.prisma.db.savedOpportunity.delete({
      where: { userId_opportunityId: { userId, opportunityId } },
    });
  }
}
