import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import { UpsertScheduleDto } from './dto/upsert-schedule.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { IPodMeetingScheduleRepository, POD_MEETING_SCHEDULE_REPOSITORY } from './repositories/pod-meeting-schedule.repository.interface';

/**
 * The recurring pattern, kept separate from individual PodEvents (§1.5).
 * Never auto-generates future PodEvents — its stored defaults exist solely
 * to pre-fill the next PodEvent a Steward creates (see PodEventsService,
 * Founder Decision #10).
 */
@Injectable()
export class PodMeetingScheduleService {
  constructor(
    @Inject(POD_MEETING_SCHEDULE_REPOSITORY) private readonly repo: IPodMeetingScheduleRepository,
    private readonly auth: PodAuthorizationService,
  ) {}

  async upsert(podId: string, dto: UpsertScheduleDto, caller: AuthenticatedUser): Promise<ScheduleResponseDto> {
    await this.auth.assertStewardOrAdmin(podId, caller);
    const schedule = await this.repo.upsert({ podId, ...dto, createdById: caller.id });
    return ScheduleResponseDto.fromEntity(schedule);
  }

  async findForPod(podId: string, caller: AuthenticatedUser): Promise<ScheduleResponseDto | null> {
    await this.auth.assertActiveMemberOrAdmin(podId, caller);
    const schedule = await this.repo.findByPod(podId);
    return schedule ? ScheduleResponseDto.fromEntity(schedule) : null;
  }
}
