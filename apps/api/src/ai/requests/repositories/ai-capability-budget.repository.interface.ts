import { AiCapability, AiCapabilityBudget } from '@prisma/client';

export const AI_CAPABILITY_BUDGET_REPOSITORY = 'AI_CAPABILITY_BUDGET_REPOSITORY';

export interface UpsertAiCapabilityBudgetInput {
  capability: AiCapability;
  dailyBudgetUsd?: number | null;
  dailyRequestLimit?: number | null;
  updatedById: string;
}

export interface IAiCapabilityBudgetRepository {
  findAll(): Promise<AiCapabilityBudget[]>;
  findByCapability(capability: AiCapability): Promise<AiCapabilityBudget | null>;
  upsert(data: UpsertAiCapabilityBudgetInput): Promise<AiCapabilityBudget>;
  remove(capability: AiCapability): Promise<void>;
}
