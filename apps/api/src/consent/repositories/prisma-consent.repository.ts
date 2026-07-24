import { Injectable } from '@nestjs/common';
import { ConsentRecord } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsentInput, IConsentRepository } from './consent.repository.interface';

@Injectable()
export class PrismaConsentRepository implements IConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async grant(data: CreateConsentInput): Promise<ConsentRecord> {
    return this.prisma.db.consentRecord.create({ data });
  }

  async findLatestByUser(userId: string): Promise<ConsentRecord | null> {
    return this.prisma.db.consentRecord.findFirst({
      where: { userId },
      orderBy: { grantedAt: 'desc' },
    });
  }
}
