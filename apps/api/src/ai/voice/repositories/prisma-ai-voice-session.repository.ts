import { Injectable } from '@nestjs/common';
import { AiVoiceSession, VoiceSessionEndReason } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAiVoiceSessionInput, IAiVoiceSessionRepository } from './ai-voice-session.repository.interface';

@Injectable()
export class PrismaAiVoiceSessionRepository implements IAiVoiceSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAiVoiceSessionInput): Promise<AiVoiceSession> {
    return this.prisma.db.aiVoiceSession.create({ data });
  }

  async findById(id: string): Promise<AiVoiceSession | null> {
    return this.prisma.db.aiVoiceSession.findUnique({ where: { id } });
  }

  async findActiveByUser(userId: string): Promise<AiVoiceSession | null> {
    return this.prisma.db.aiVoiceSession.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
  }

  async end(id: string, endReason: VoiceSessionEndReason): Promise<AiVoiceSession> {
    return this.prisma.db.aiVoiceSession.update({
      where: { id },
      data: { endedAt: new Date(), endReason },
    });
  }
}
