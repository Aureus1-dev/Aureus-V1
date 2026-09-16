import { Injectable } from '@nestjs/common';
import { NeedOutcomeReport } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateNeedOutcomeReportInput,
  INeedOutcomeReportRepository,
} from './need-outcome-report.repository.interface';

@Injectable()
export class PrismaNeedOutcomeReportRepository implements INeedOutcomeReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateNeedOutcomeReportInput): Promise<NeedOutcomeReport> {
    return this.prisma.db.needOutcomeReport.create({ data: input });
  }

  findLatestByStatedNeed(statedNeedId: string): Promise<NeedOutcomeReport | null> {
    return this.prisma.db.needOutcomeReport.findFirst({
      where: { statedNeedId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}
