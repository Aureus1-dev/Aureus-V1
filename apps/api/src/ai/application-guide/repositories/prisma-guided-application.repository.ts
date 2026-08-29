import { Injectable } from '@nestjs/common';
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

  end(id: string, endedAt: Date): Promise<GuidedApplicationSession> {
    return this.prisma.db.guidedApplicationSession.update({
      where: { id },
      data: {
        status: GuidedApplicationSessionStatus.ENDED,
        endedAt,
        screenCaptureConsentRevokedAt: endedAt,
      },
    });
  }

  setConsent(
    id: string,
    granted: boolean,
    occurredAt: Date,
  ): Promise<GuidedApplicationSessionWithOpportunity> {
    return this.prisma.db.guidedApplicationSession.update({
      where: { id },
      data: granted
        ? {
            screenCaptureConsentGrantedAt: occurredAt,
            screenCaptureConsentRevokedAt: null,
          }
        : { screenCaptureConsentRevokedAt: occurredAt },
      include: { opportunity: true },
    });
  }

  async markAnalyzed(id: string, analyzedAt: Date): Promise<void> {
    await this.prisma.db.guidedApplicationSession.update({
      where: { id },
      data: { lastFrameAnalyzedAt: analyzedAt },
    });
  }
}
