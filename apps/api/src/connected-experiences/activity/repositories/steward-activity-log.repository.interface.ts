import { StewardActivityActor, StewardActivityEventType, StewardActivityLog } from '@prisma/client';

export const STEWARD_ACTIVITY_LOG_REPOSITORY = 'STEWARD_ACTIVITY_LOG_REPOSITORY';

export interface CreateStewardActivityLogInput {
  userId: string;
  eventType: StewardActivityEventType;
  actor: StewardActivityActor;
  description: string;
  connectedAccountId?: string;
  documentId?: string;
}

export interface StewardActivityLogQueryParams {
  page: number;
  limit: number;
  userId: string;
  eventType?: StewardActivityEventType;
}

export interface PaginatedStewardActivityLogs {
  data: StewardActivityLog[];
  total: number;
  page: number;
  limit: number;
}

export interface IStewardActivityLogRepository {
  create(data: CreateStewardActivityLogInput): Promise<StewardActivityLog>;
  findAll(params: StewardActivityLogQueryParams): Promise<PaginatedStewardActivityLogs>;
}
