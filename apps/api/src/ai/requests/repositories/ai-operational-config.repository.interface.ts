import { AiOperationalConfig } from '@prisma/client';

export const AI_OPERATIONAL_CONFIG_REPOSITORY = 'AI_OPERATIONAL_CONFIG_REPOSITORY';

export interface AiOperationalConfigDefaults {
  emergencyStop: boolean;
  globalDailyBudgetUsd: number;
  userDailyBudgetUsd: number;
}

export interface UpdateAiOperationalConfigInput {
  emergencyStop?: boolean;
  globalDailyBudgetUsd?: number;
  userDailyBudgetUsd?: number;
  updatedById: string;
}

export interface IAiOperationalConfigRepository {
  /**
   * Returns the singleton config row, creating it from `defaults` the
   * first time it's read (PR-003) — env vars seed a fresh installation,
   * the DB row is authoritative from then on.
   */
  getOrCreate(defaults: AiOperationalConfigDefaults): Promise<AiOperationalConfig>;

  update(data: UpdateAiOperationalConfigInput): Promise<AiOperationalConfig>;
}
