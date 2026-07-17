import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ActivityLogResponseDto } from './dto/activity-log-response.dto';
import { ListActivityQueryDto } from './dto/list-activity-query.dto';
import { PaginatedActivityResponseDto } from './dto/paginated-activity-response.dto';
import {
  CreateStewardActivityLogInput,
  IStewardActivityLogRepository,
  STEWARD_ACTIVITY_LOG_REPOSITORY,
} from './repositories/steward-activity-log.repository.interface';

/**
 * Append-only audit trail (DOMAIN-008 Founder Decision 5) — the foundation
 * for the future Trust Center. Every connection, revocation, upload,
 * summarization, and deletion in Connected Experiences is recorded here
 * with the acting party (member, AI Steward, or system) so a member can
 * always see exactly what happened to their data and why.
 */
@Injectable()
export class StewardActivityLogService {
  constructor(
    @Inject(STEWARD_ACTIVITY_LOG_REPOSITORY) private readonly repo: IStewardActivityLogRepository,
  ) {}

  async record(input: CreateStewardActivityLogInput): Promise<void> {
    await this.repo.create(input);
  }

  async findMine(query: ListActivityQueryDto, caller: AuthenticatedUser): Promise<PaginatedActivityResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.repo.findAll({ page, limit, userId: caller.id, eventType: query.eventType });

    return {
      data: result.data.map(ActivityLogResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }
}
