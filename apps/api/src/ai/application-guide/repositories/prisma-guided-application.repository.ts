import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateGuidedApplicationSessionInput,
  GuidedApplicationSessionStatus,
  GuidedApplicationSessionWithOpportunity,
  IGuidedApplicationRepository,
} from './guided-application.repository.interface';
import { GuidedApplicationSession } from '@prisma/client';

@Injectable()
export class PrismaGuidedApplicationRepository
  implements IGuidedApplicationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: CreateGuidedApplicationSessionInput,
  ): Promise<GuidedApplicationSession> {
    return this.prisma.db.guidedApplicationSession.create({ data });
  }

  findActiveByConversation(
    userId: string,
    conversationId: string,
  ): Promise<GuidedApplicationSessionWithOpportunity | null> {
    return this.prisma.db.guidedApplicationSession.findFirst({
      where: {
        userId,
        conversationId,
        status: GuidedApplicationSessionStatus.ACTIVE,
      },
      include: { opportunity: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOwnedActiveById(
    id: string,
    userId: string,
  ): Promise<GuidedApplicationSession | null> {
    return this.prisma.db.guidedApplicationSession.findFirst({
      where: {
        id,
        userId,
        status: GuidedApplicationSessionStatus.ACTIVE,
      },
    });
  }

  async end(
    id: string,
    userId: string,
    endedAt: Date,
  ): Promise<GuidedApplicationSession> {
    const { count } = await this.prisma.db.guidedApplicationSession.updateMany({
      where: { id, userId, status: GuidedApplicationSessionStatus.ACTIVE },
      data: {
        status: GuidedApplicationSessionStatus.ENDED,
        endedAt,
        screenCaptureConsentRevokedAt: endedAt,
      },
    });
    if (count === 0) {
      throw new NotFoundException('Active application guidance session not found');
    }
    return this.prisma.db.guidedApplicationSession.findUniqueOrThrow({ where: { id } });
  }

  async setConsent(
    id: string,
    userId: string,
    granted: boolean,
    occurredAt: Date,
  ): Promise<GuidedApplicationSessionWithOpportunity> {
    const { count } = await this.prisma.db.guidedApplicationSession.updateMany({
      where: { id, userId, status: GuidedApplicationSessionStatus.ACTIVE },
      data: granted
        ? {
            screenCaptureConsentGrantedAt: occurredAt,
            screenCaptureConsentRevokedAt: null,
          }
        : { screenCaptureConsentRevokedAt: occurredAt },
    });
    if (count === 0) {
      throw new NotFoundException('Active application guidance session not found');
    }
    return this.prisma.db.guidedApplicationSession.findUniqueOrThrow({
      where: { id },
      include: { opportunity: true },
    });
  }

  async markAnalyzed(id: string, userId: string, analyzedAt: Date): Promise<void> {
    const { count } = await this.prisma.db.guidedApplicationSession.updateMany({
      where: { id, userId, status: GuidedApplicationSessionStatus.ACTIVE },
      data: { lastFrameAnalyzedAt: analyzedAt },
    });
    if (count === 0) {
      throw new NotFoundException('Active application guidance session not found');
    }
  }
}
