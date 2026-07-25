import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiCapability, AiCapabilityBudget, AiOperationalConfig } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/ai-roles.util';
import {
  AI_OPERATIONAL_CONFIG_REPOSITORY,
  IAiOperationalConfigRepository,
} from './repositories/ai-operational-config.repository.interface';
import {
  AI_CAPABILITY_BUDGET_REPOSITORY,
  IAiCapabilityBudgetRepository,
} from './repositories/ai-capability-budget.repository.interface';
import { UpdateAiOperationalConfigDto } from './dto/update-ai-operational-config.dto';
import { SetAiCapabilityBudgetDto } from './dto/set-ai-capability-budget.dto';

const DEFAULT_GLOBAL_DAILY_BUDGET_USD = 50;
const DEFAULT_USER_DAILY_BUDGET_USD = 2;

/**
 * The live-editable successor to PR-002's env-var-only AI spend controls
 * (PR-003 Founder Operating System — "AI operational controls"). The env
 * vars (AI_EMERGENCY_STOP, AI_GLOBAL_DAILY_BUDGET_USD,
 * AI_USER_DAILY_BUDGET_USD) still exist and now serve exactly one purpose:
 * seeding the singleton DB row the first time it's ever read, on a fresh
 * installation. Every read/write after that is DB-authoritative — a
 * Platform/System Administrator can flip the emergency stop or adjust a
 * budget ceiling from the Founder Operating System without a restart.
 */
@Injectable()
export class AiOperationalConfigService {
  private readonly logger = new Logger(AiOperationalConfigService.name);

  constructor(
    @Inject(AI_OPERATIONAL_CONFIG_REPOSITORY) private readonly repo: IAiOperationalConfigRepository,
    @Inject(AI_CAPABILITY_BUDGET_REPOSITORY) private readonly capabilityBudgetRepo: IAiCapabilityBudgetRepository,
    private readonly config: ConfigService,
  ) {}

  /** The effective config — seeded from env vars on first read, DB-authoritative thereafter. */
  async getEffective(): Promise<AiOperationalConfig> {
    return this.repo.getOrCreate({
      emergencyStop: this.config.get<string>('AI_EMERGENCY_STOP', 'false') === 'true',
      globalDailyBudgetUsd: this.config.get<number>('AI_GLOBAL_DAILY_BUDGET_USD', DEFAULT_GLOBAL_DAILY_BUDGET_USD),
      userDailyBudgetUsd: this.config.get<number>('AI_USER_DAILY_BUDGET_USD', DEFAULT_USER_DAILY_BUDGET_USD),
    });
  }

  async update(dto: UpdateAiOperationalConfigDto, caller: AuthenticatedUser): Promise<AiOperationalConfig> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may change AI operational controls');
    }

    // Ensures the row exists (and is seeded) before a partial upsert-update,
    // so an admin's first-ever PATCH doesn't accidentally reset the two
    // fields they didn't touch back to the Prisma schema's hardcoded
    // defaults instead of the env-seeded ones.
    await this.getEffective();

    const updated = await this.repo.update({ ...dto, updatedById: caller.id });

    if (dto.emergencyStop !== undefined) {
      this.logger.warn(`AI emergency stop set to ${dto.emergencyStop} by ${caller.id}`);
    }
    if (dto.globalDailyBudgetUsd !== undefined || dto.userDailyBudgetUsd !== undefined) {
      this.logger.warn(
        `AI budget ceilings updated by ${caller.id}: global=$${updated.globalDailyBudgetUsd} user=$${updated.userDailyBudgetUsd}`,
      );
    }

    return updated;
  }

  /** PD-009 — every per-capability ceiling currently configured (Founder Operating System visibility). */
  async getCapabilityBudgets(): Promise<AiCapabilityBudget[]> {
    return this.capabilityBudgetRepo.findAll();
  }

  /** PD-009 — the effective ceiling for one capability, or `null` if none is configured. Read by `AiRequestsService.enforceSpendCeilings`. */
  async getCapabilityBudget(capability: AiCapability): Promise<AiCapabilityBudget | null> {
    return this.capabilityBudgetRepo.findByCapability(capability);
  }

  /** PD-009 — set (or replace) a per-capability ceiling. Administrator only, mirrors `update()`'s own authorization. */
  async setCapabilityBudget(dto: SetAiCapabilityBudgetDto, caller: AuthenticatedUser): Promise<AiCapabilityBudget> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may change AI capability budgets');
    }

    const updated = await this.capabilityBudgetRepo.upsert({
      capability: dto.capability,
      dailyBudgetUsd: dto.dailyBudgetUsd ?? null,
      dailyRequestLimit: dto.dailyRequestLimit ?? null,
      updatedById: caller.id,
    });

    this.logger.warn(
      `AI capability budget updated by ${caller.id}: ${dto.capability} — dailyBudgetUsd=${updated.dailyBudgetUsd ?? 'none'} dailyRequestLimit=${updated.dailyRequestLimit ?? 'none'}`,
    );

    return updated;
  }

  /** PD-009 — removes a capability's ceiling entirely (no limit until one is set again). Administrator only. */
  async removeCapabilityBudget(capability: AiCapability, caller: AuthenticatedUser): Promise<void> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may change AI capability budgets');
    }

    await this.capabilityBudgetRepo.remove(capability);
    this.logger.warn(`AI capability budget removed by ${caller.id}: ${capability}`);
  }
}
