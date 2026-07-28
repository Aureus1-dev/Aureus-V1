import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IUserRepository, USER_REPOSITORY } from '../users/repositories/user.repository.interface';

/**
 * Guest Steward mode privacy lifecycle: "creating a free account is only
 * to preserve progress — a guest who never claims one should not have
 * their personal story or conversations kept indefinitely." Runs daily,
 * permanently deleting any guest account (never claimed) whose last real
 * activity (`GuestActivityInterceptor`) is older than
 * `GUEST_SESSION_RETENTION_DAYS` (default 7 — comfortably longer than an
 * overnight or weekend gap, comfortably shorter than the 30-day refresh
 * token a guest's own browser might still be holding, so their data is
 * gone before that token would have expired anyway).
 *
 * This is a genuine hard delete (`IUserRepository.deleteInactiveGuests`),
 * not a soft delete — every relation to `User` cascades (schema.prisma),
 * so a purged guest's conversations, stated needs, and goals are removed
 * with it, not merely hidden.
 */
@Injectable()
export class GuestLifecycleService {
  private readonly logger = new Logger(GuestLifecycleService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleScheduledPurge(): Promise<void> {
    await this.purgeInactiveGuests();
  }

  /**
   * `asOfDate` lets a caller (a test, or an operator running this
   * on-demand) compute the cutoff deterministically without waiting on
   * the real clock — the production `@Cron` call above never passes it.
   */
  async purgeInactiveGuests(asOfDate: Date = new Date()): Promise<number> {
    const retentionDays = this.config.get<number>('GUEST_SESSION_RETENTION_DAYS', 7);
    const cutoff = new Date(asOfDate.getTime() - retentionDays * 86_400_000);

    const count = await this.users.deleteInactiveGuests(cutoff);
    if (count > 0) {
      this.logger.log(`Purged ${count} inactive guest account(s) (inactive since before ${cutoff.toISOString()})`);
    }
    return count;
  }
}
