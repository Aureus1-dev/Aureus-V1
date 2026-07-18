import { Injectable } from '@nestjs/common';
import { AiOperationalConfig } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AiOperationalConfigDefaults,
  IAiOperationalConfigRepository,
  UpdateAiOperationalConfigInput,
} from './ai-operational-config.repository.interface';

const SINGLETON_ID = 'singleton';

@Injectable()
export class PrismaAiOperationalConfigRepository implements IAiOperationalConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(defaults: AiOperationalConfigDefaults): Promise<AiOperationalConfig> {
    return this.prisma.db.aiOperationalConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...defaults },
      update: {},
    });
  }

  async update(data: UpdateAiOperationalConfigInput): Promise<AiOperationalConfig> {
    const { updatedById, ...patch } = data;
    return this.prisma.db.aiOperationalConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...patch, updatedById },
      update: { ...patch, updatedById },
    });
  }
}
