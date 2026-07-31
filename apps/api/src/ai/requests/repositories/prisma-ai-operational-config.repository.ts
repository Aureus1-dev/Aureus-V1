import { Injectable } from '@nestjs/common';
import { AiOperationalConfig, Prisma } from '@prisma/client';
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

  /**
   * `enforceSpendCeilings()` calls this on every AI completion, including
   * several fired concurrently within one request (a COORDINATED_PLAN
   * orchestration runs one Recommendation category's completion per
   * category via Promise.all — Member Arrival — Steward Experience
   * migration). The very first time this singleton row is ever read, two
   * or more of those concurrent upserts can race to create it, which
   * surfaces as a unique constraint violation (P2002) for every loser of
   * the race — each of them only needs to read the row the winner just
   * created.
   */
  async getOrCreate(defaults: AiOperationalConfigDefaults): Promise<AiOperationalConfig> {
    try {
      return await this.prisma.db.aiOperationalConfig.upsert({
        where: { id: SINGLETON_ID },
        create: { id: SINGLETON_ID, ...defaults },
        update: {},
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return this.prisma.db.aiOperationalConfig.findUniqueOrThrow({ where: { id: SINGLETON_ID } });
      }
      throw err;
    }
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
