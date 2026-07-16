import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PodInvitationStatus, PodMembershipOrigin, PodMembershipStatus, PodType } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import { CreateInvitationDto, InvitationResponseDto, RespondToInvitationDto } from './dto/invitation.dto';
import { IPodInvitationRepository, POD_INVITATION_REPOSITORY } from './repositories/pod-invitation.repository.interface';
import { IPodRepository, POD_REPOSITORY } from '../repositories/pod.repository.interface';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';

/**
 * Article IV: "True friendship shall never be forced. It shall always be
 * invited." Founder Decision #3 — split-by-type: HOME Pod invitations are
 * Steward/Admin-only (intentional matching); INTEREST Pod invitations may
 * come from any active member (organic community growth).
 */
@Injectable()
export class PodInvitationsService {
  constructor(
    @Inject(POD_INVITATION_REPOSITORY) private readonly repo: IPodInvitationRepository,
    @Inject(POD_REPOSITORY) private readonly podRepo: IPodRepository,
    @Inject(POD_MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IPodMembershipRepository,
    private readonly auth: PodAuthorizationService,
  ) {}

  async create(podId: string, dto: CreateInvitationDto, caller: AuthenticatedUser): Promise<InvitationResponseDto> {
    const pod = await this.podRepo.findById(podId);
    if (!pod) throw new NotFoundException(`Pod '${podId}' not found`);

    if (pod.type === PodType.HOME) {
      await this.auth.assertStewardOrAdmin(podId, caller);
    } else {
      await this.auth.assertActiveMemberOrAdmin(podId, caller);
    }

    const existing = await this.repo.findPendingForPodAndUser(podId, dto.invitedUserId);
    if (existing) throw new ConflictException('A pending invitation for this person already exists on this Pod');

    const invitation = await this.repo.create({ podId, invitedUserId: dto.invitedUserId, invitedById: caller.id, message: dto.message });
    return InvitationResponseDto.fromEntity(invitation);
  }

  async findMine(caller: AuthenticatedUser): Promise<InvitationResponseDto[]> {
    const invitations = await this.repo.findForInvitee(caller.id);
    return invitations.map(InvitationResponseDto.fromEntity);
  }

  async respond(id: string, dto: RespondToInvitationDto, caller: AuthenticatedUser): Promise<InvitationResponseDto> {
    const invitation = await this.getOrThrow(id);
    if (invitation.invitedUserId !== caller.id) throw new ForbiddenException('You may only respond to your own invitations');
    if (invitation.status !== PodInvitationStatus.PENDING) {
      throw new ConflictException(`This invitation is '${invitation.status}' and can no longer be responded to`);
    }

    if (dto.decision === 'ACCEPT') {
      const existingActive = await this.membershipRepo.findActiveForPodAndUser(invitation.podId, caller.id);
      if (!existingActive) {
        const pending = await this.membershipRepo.findPendingForPodAndUser(invitation.podId, caller.id);
        if (pending) {
          await this.membershipRepo.update(pending.id, { status: PodMembershipStatus.ACTIVE, joinedAt: new Date() });
        } else {
          await this.membershipRepo.create({
            podId: invitation.podId, userId: caller.id, origin: PodMembershipOrigin.STEWARD_INVITATION,
            status: PodMembershipStatus.ACTIVE, invitedById: invitation.invitedById, joinedAt: new Date(),
          });
        }
      }
    }

    const updated = await this.repo.update(id, {
      status: dto.decision === 'ACCEPT' ? PodInvitationStatus.ACCEPTED : PodInvitationStatus.DECLINED,
      respondedAt: new Date(),
    });
    return InvitationResponseDto.fromEntity(updated);
  }

  private async getOrThrow(id: string) {
    const invitation = await this.repo.findById(id);
    if (!invitation) throw new NotFoundException(`Pod invitation '${id}' not found`);
    return invitation;
  }
}
