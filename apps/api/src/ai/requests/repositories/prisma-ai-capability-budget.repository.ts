import { Injectable } from '@nestjs/common';
import { AiCapability, AiCapabilityBudget } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAiCapabilityBudgetRepository, UpsertAiCapabilityBudgetInput } from './ai-capability-budget.repository.interface';

@Injectable()
export class PrismaAiCapabilityBudgetRepository implements IAiCapabilityBudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AiCapabilityBudget[]> {
    return this.prisma.db.aiCapabilityBudget.findMany({ orderBy: { capability: 'asc' } });
  }

  async findByCapability(capability: AiCapability): Promise<AiCapabilityBudget | null> {
    return this.prisma.db.aiCapabilityBudget.findUnique({ where: { capability } });
  }

  async upsert(data: UpsertAiCapabilityBudgetInput): Promise<AiCapabilityBudget> {
    const { capability, dailyBudgetUsd, dailyRequestLimit, updatedById } = data;
    return this.prisma.db.aiCapabilityBudget.upsert({
      where: { capability },
      create: { capability, dailyBudgetUsd, dailyRequestLimit, updatedById },
      update: { dailyBudgetUsd, dailyRequestLimit, updatedById },
    });
  }

  async remove(capability: AiCapability): Promise<void> {
    await this.prisma.db.aiCapabilityBudget.deleteMany({ where: { capability } });
  }
}
