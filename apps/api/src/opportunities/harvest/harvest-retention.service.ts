import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  HARVEST_REPOSITORY,
  IHarvestRepository,
} from './repositories/harvest.repository.interface';

/**
 * Enforces the Annual Harvest financial-data retention boundary.
 *
 * Each HarvestPlan receives a retentionExpiresAt timestamp when it is created.
 * This service turns that timestamp into real deletion behavior instead of a
 * passive policy marker. Deleting a HarvestPlan cascades to its HarvestPlanItem
 * and HarvestEvent records under the Prisma schema.
 */
@Injectable()
export class HarvestRetentionService {
  private readonly logger = new Logger(HarvestRetentionService.name);

  constructor(
    @Inject(HARVEST_REPOSITORY)
    private readonly repo: IHarvestRepository,
  ) {}

  @Cron('0 4 * * *', { timeZone: 'UTC' })
  async handleScheduledPurge(): Promise<void> {
    await this.purgeExpiredPlans();
  }

  /**
   * asOfDate keeps the purge deterministic for tests and controlled operator
   * execution. Production cron calls this with the real current time.
   */
  async purgeExpiredPlans(asOfDate: Date = new Date()): Promise<number> {
    const count = await this.repo.deleteExpiredPlans(asOfDate);
    if (count > 0) {
      this.logger.log(
        `Purged ${count} expired Annual Harvest plan(s) at ${asOfDate.toISOString()}`,
      );
    }
    return count;
  }
}
