import { Injectable } from '@nestjs/common';
import { AiTurnEvent, AiTurnEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAiTurnEventInput, IAiTurnEventRepository } from './ai-turn-event.repository.interface';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaAiTurnEventRepository implements IAiTurnEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIfNotExists(data: CreateAiTurnEventInput): Promise<AiTurnEvent> {
    try {
      return await this.prisma.db.aiTurnEvent.create({ data });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === UNIQUE_CONSTRAINT_VIOLATION &&
        data.providerItemId
      ) {
        const existing = await this.prisma.db.aiTurnEvent.findUnique({
          where: {
            voiceSessionId_type_providerItemId: {
              voiceSessionId: data.voiceSessionId,
              type: data.type,
              providerItemId: data.providerItemId,
            },
          },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async findByVoiceSession(voiceSessionId: string): Promise<AiTurnEvent[]> {
    return this.prisma.db.aiTurnEvent.findMany({
      where: { voiceSessionId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async hasFinalizedTurn(voiceSessionId: string, providerItemId: string): Promise<boolean> {
    const count = await this.prisma.db.aiTurnEvent.count({
      where: { voiceSessionId, providerItemId, type: AiTurnEventType.MEMBER_TURN_FINALIZED },
    });
    return count > 0;
  }
}
