import { NeedOutcomeReport, NeedOutcomeStatus } from '@prisma/client';

export const NEED_OUTCOME_REPORT_REPOSITORY = 'NEED_OUTCOME_REPORT_REPOSITORY';

export interface CreateNeedOutcomeReportInput {
  userId: string;
  statedNeedId: string;
  status: NeedOutcomeStatus;
  note?: string | null;
}

export interface INeedOutcomeReportRepository {
  create(input: CreateNeedOutcomeReportInput): Promise<NeedOutcomeReport>;
  findLatestByStatedNeed(statedNeedId: string): Promise<NeedOutcomeReport | null>;
}
