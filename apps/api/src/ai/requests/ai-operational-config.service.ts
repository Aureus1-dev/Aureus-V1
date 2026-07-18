import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOperationalConfig } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/ai-roles.util';
import {
  AI_OPERATIONAL_CONFIG_REPOSITORY,
  IAiOperationalConfigRepository,
} from './repositories/ai-operational-config.repository.interface';
import { UpdateAiOperationalConfigDto } from './dto/update-ai-operational-config.dto';

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
}
