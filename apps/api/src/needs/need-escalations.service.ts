import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationCategory, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { hasRole } from '../auth/utils/has-role.util';
import { NotificationsService } from '../communication/notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { IStatedNeedRepository, STATED_NEED_REPOSITORY } from './repositories/stated-need.repository.interface';
import {
  IStatedNeedEscalationRepository,
  NEED_ESCALATION_REPOSITORY,
} from './repositories/need-escalation.repository.interface';
import { IOnCallHoursRepository, ON_CALL_HOURS_REPOSITORY } from './repositories/on-call-hours.repository.interface';
import { NeedEscalationResponseDto } from './dto/need-escalation-response.dto';
import { OnCallHoursResponseDto } from './dto/on-call-hours-response.dto';

const STEWARD_OR_ADMIN_ROLES: UserRole[] = [
  UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR,
];

/**
 * Gate C (C6: Steward escalation). "When a member's need exceeds automated
 * resolution, a human steward... is reachably paged... escalation is never
 * triggered without the member's choice." `escalate()` is the only entry
 * point — nothing in the Clearing calls it automatically; it exists solely
 * for a member's own explicit action.
 */
@Injectable()
export class NeedEscalationsService {
  constructor(
    @Inject(STATED_NEED_REPOSITORY) private readonly needs: IStatedNeedRepository,
    @Inject(NEED_ESCALATION_REPOSITORY) private readonly repo: IStatedNeedEscalationRepository,
    @Inject(ON_CALL_HOURS_REPOSITORY) private readonly onCallHours: IOnCallHoursRepository,
    private readonly notifications: NotificationsService,
    private readonly users: UsersService,
  ) {}

  async escalate(needId: string, reason: string | undefined, callerId: string): Promise<NeedEscalationResponseDto> {
    const need = await this.getOwnedNeedOrThrow(needId, callerId);

    const created = await this.repo.create({ userId: callerId, statedNeedId: need.id, reason });
    await this.pageStewards(need.id);

    return NeedEscalationResponseDto.fromEntity(created);
  }

  /** Every escalation and its outcome, retrievable by the stated need's owner. */
  async findEscalations(needId: string, callerId: string): Promise<NeedEscalationResponseDto[]> {
    const need = await this.getOwnedNeedOrThrow(needId, callerId);
    const rows = await this.repo.findAllByStatedNeed(need.id);
    return rows.map(NeedEscalationResponseDto.fromEntity);
  }

  async acknowledge(escalationId: string, caller: AuthenticatedUser): Promise<NeedEscalationResponseDto> {
    this.assertStewardOrAdmin(caller);
    await this.getEscalationOrThrow(escalationId);

    const updated = await this.repo.acknowledge(escalationId, caller.id);
    return NeedEscalationResponseDto.fromEntity(updated);
  }

  async resolve(
    escalationId: string, resolutionNotes: string | undefined, caller: AuthenticatedUser,
  ): Promise<NeedEscalationResponseDto> {
    this.assertStewardOrAdmin(caller);
    await this.getEscalationOrThrow(escalationId);

    const updated = await this.repo.resolve(escalationId, caller.id, resolutionNotes);
    return NeedEscalationResponseDto.fromEntity(updated);
  }

  /** The honestly published on-call rotation — null when not yet configured, never a fabricated placeholder. */
  async getOnCallHours(): Promise<OnCallHoursResponseDto> {
    const hours = await this.onCallHours.getOrCreate();
    return OnCallHoursResponseDto.fromEntity(hours);
  }

  async setOnCallHours(hoursDescription: string, caller: AuthenticatedUser): Promise<OnCallHoursResponseDto> {
    this.assertStewardOrAdmin(caller);
    const updated = await this.onCallHours.update({ hoursDescription, updatedById: caller.id });
    return OnCallHoursResponseDto.fromEntity(updated);
  }

  /**
   * Pages every current Steward and Platform Administrator (P3: "Founder
   * plus one trusted human steward") via the existing Communication System.
   * `bypassPreferences: true` because a member choosing to escalate must
   * reliably reach a steward — this is the one category a steward cannot
   * silently mute, mirroring how SYSTEM notifications already always force
   * delivery.
   */
  private async pageStewards(statedNeedId: string): Promise<void> {
    const [stewards, admins] = await Promise.all([
      this.users.findAll({ page: 1, limit: 50, role: UserRole.STEWARD }),
      this.users.findAll({ page: 1, limit: 50, role: UserRole.PLATFORM_ADMINISTRATOR }),
    ]);

    await Promise.all(
      [...stewards.data, ...admins.data].map((recipient) =>
        this.notifications.notify({
          recipientId: recipient.id,
          category: NotificationCategory.STEWARDSHIP,
          type: 'need_escalation',
          title: 'A member asked for a human steward',
          body: 'A member escalated a stated need and is waiting for direct steward help.',
          data: { statedNeedId },
          bypassPreferences: true,
        }),
      ),
    );
  }

  private assertStewardOrAdmin(caller: AuthenticatedUser): void {
    if (!hasRole(caller, STEWARD_OR_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Steward or Platform Administrator may act on an escalation');
    }
  }

  private async getEscalationOrThrow(id: string) {
    const escalation = await this.repo.findById(id);
    if (!escalation) throw new NotFoundException(`Escalation '${id}' not found`);
    return escalation;
  }

  private async getOwnedNeedOrThrow(needId: string, callerId: string) {
    const need = await this.needs.findById(needId);
    if (!need) throw new NotFoundException(`Stated need '${needId}' not found`);
    if (need.userId !== callerId) throw new ForbiddenException('You may only act on your own stated needs');
    return need;
  }
}
