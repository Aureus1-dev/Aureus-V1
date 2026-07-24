import { ConsentRecord } from '@prisma/client';

export const CONSENT_REPOSITORY = 'CONSENT_REPOSITORY';

export interface CreateConsentInput {
  userId: string;
  version: string;
}

export interface IConsentRepository {
  grant(data: CreateConsentInput): Promise<ConsentRecord>;
  findLatestByUser(userId: string): Promise<ConsentRecord | null>;
}
