import { ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationCategory, PodMembershipOrigin, PodMembershipStatus, PodType, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/pods-roles.util';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import { SuggestHomePodDto } from './dto/suggest-home-pod.dto';
import { RespondToMembershipDto } from './dto/respond-to-membership.dto';
import { SetRoleDto } from './dto/set-role.dto';
import { MembershipResponseDto } from './dto/membership-response.dto';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from './repositories/pod-membership.repository.interface';
import { IPodRepository, POD_REPOSITORY } from '../repositories/pod.repository.interface';
import { PodMatchingService } from '../matching/pod-matching.service';
import { NotificationsService } from '../../communication/notifications/notifications.service';

@Injectable()
export class PodMembershipsService {
  private readonly logger = new Logger(PodMembershipsService.name);

  constructor(
    @Inject(POD_MEMBERSHIP_REPOSITORY) private readonly repo: IPodMembershipRepository,
    @Inject(POD_REPOSITORY) private readonly podRepo: IPodRepository,
    private readonly matching: PodMatchingService,
    private readonly auth: PodAuthorizationService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * The proactive Home Pod invitation mechanism (§3, Founder Decision #1).
   * AI_SERVICE_ACCOUNT-gated, mirroring StewardshipRelationship's
   * recommendSteward() — always lands PENDING, never assigns. "The
   * Institution takes the first step so that no person unnecessarily walks
   * life's journey alone."
   */
  async suggestHomePod(dto: SuggestHomePodDto, caller: AuthenticatedUser): Promise<MembershipResponseDto> {
    if (!hasRole(caller, [UserRole.AI_SERVICE_ACCOUNT]) && !hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only an AI service account or Administrator may prepare a Home Pod invitation');
    }

    const existing = await this.repo.findAll({ page: 1, limit: 50, userId: dto.userId });
    const hasHomePod = existing.data.some((m) => m.status === PodMembershipStatus.ACTIVE || m.status === PodMembershipStatus.PENDING);
    if (hasHomePod) {
      throw new ConflictException('This member already has an active or pending Home Pod membership');
    }

    const candidates = await this.matching.rankCandidates(dto.userId, PodType.HOME, 1);
    if (candidates.length === 0) {
      throw new NotFoundException('No Home Pod candidate is currently available for this member');
    }

    const membership = await this.repo.create({
      podId: candidates[0].pod.id,
      userId: dto.userId,
      origin: PodMembershipOrigin.AI_MATCH_SUGGESTION,
      status: PodMembershipStatus.PENDING,
    });

    await this.notify(dto.userId, 'A Home Pod has been prepared for you',
      'Aureus has prepared a Home Pod invitation for you — a small community of belonging and stewardship. Review it and respond whenever you are ready; this invitation is never automatic membership.');

    this.logger.log(`Home Pod suggestion created: pod=${candidates[0].pod.id} member=${dto.userId}`);
    return MembershipResponseDto.fromEntity(membership);
  }

  /** The member's own response to a PENDING invitation — accept, decline, or defer. Never automatic (Founder Decision #1). */
  async respond(id: string, dto: RespondToMembershipDto, caller: AuthenticatedUser): Promise<MembershipResponseDto> {
    const membership = await this.getOrThrow(id);
    if (membership.userId !== caller.id) {
      throw new ForbiddenException('You may only respond to your own Pod invitations');
    }
    if (membership.status !== PodMembershipStatus.PENDING && membership.status !== PodMembershipStatus.DEFERRED) {
      throw new ConflictException(`This invitation is '${membership.status}' and can no longer be responded to`);
    }

    const statusFor: Record<typeof dto.decision, PodMembershipStatus> = {
      ACCEPT: PodMembershipStatus.ACTIVE,
      DECLINE: PodMembershipStatus.DECLINED,
      DEFER: PodMembershipStatus.DEFERRED,
    };
    const updated = await this.repo.update(id, {
      status: statusFor[dto.decision],
      ...(dto.decision === 'ACCEPT' && { joinedAt: new Date() }),
    });
    return MembershipResponseDto.fromEntity(updated);
  }

  /** Self-service, immediate — "Belonging shall never become imprisonment" (Article VIII). No approval gate to leave. */
  async leave(id: string, caller: AuthenticatedUser): Promise<MembershipResponseDto> {
    const membership = await this.getOrThrow(id);
    if (membership.userId !== caller.id && !this.auth.isAdmin(caller)) {
      throw new ForbiddenException('You may only end your own Pod membership');
    }
    if (membership.status !== PodMembershipStatus.ACTIVE) {
      throw new ConflictException(`Only an ACTIVE membership can be ended (current status: '${membership.status}')`);
    }
    const updated = await this.repo.update(id, {
      status: PodMembershipStatus.ENDED,
      endedAt: new Date(),
      endReason: 'MEMBER_LEFT',
    });
    return MembershipResponseDto.fromEntity(updated);
  }

  async findMine(caller: AuthenticatedUser): Promise<MembershipResponseDto[]> {
    const result = await this.repo.findAll({ page: 1, limit: 100, userId: caller.id });
    return result.data.map(MembershipResponseDto.fromEntity);
  }

  /** The Pod roster — this Pod's Steward or Admin only. */
  async findForPod(podId: string, caller: AuthenticatedUser): Promise<MembershipResponseDto[]> {
    await this.auth.assertStewardOrAdmin(podId, caller);
    const result = await this.repo.findAll({ page: 1, limit: 200, podId, status: PodMembershipStatus.ACTIVE });
    return result.data.map(MembershipResponseDto.fromEntity);
  }

  /** Institutional Appointment (Founder Decision #2) — Admin-only. Applies equally to a newly-FORMING Pod's first Steward. */
  async setRole(id: string, dto: SetRoleDto, caller: AuthenticatedUser): Promise<MembershipResponseDto> {
    if (!this.auth.isAdmin(caller)) {
      throw new ForbiddenException('Only an Administrator may appoint or transition a Pod Steward');
    }
    const membership = await this.getOrThrow(id);
    if (membership.status !== PodMembershipStatus.ACTIVE) {
      throw new ConflictException('Only an ACTIVE membership can be appointed to a role');
    }
    const updated = await this.repo.update(id, { role: dto.role });
    this.logger.log(`Membership ${id} role set to ${dto.role} by ${caller.id}`);
    return MembershipResponseDto.fromEntity(updated);
  }

  private async getOrThrow(id: string) {
    const membership = await this.repo.findById(id);
    if (!membership) throw new NotFoundException(`Pod membership '${id}' not found`);
    return membership;
  }

  private async notify(userId: string, title: string, body: string): Promise<void> {
    try {
      await this.notifications.notify({ recipientId: userId, category: NotificationCategory.POD, type: 'pod.membership.invitation', title, body });
    } catch (err) {
      this.logger.warn(`Failed to notify user ${userId}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }
}
