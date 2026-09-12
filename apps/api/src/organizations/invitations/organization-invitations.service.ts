import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationInvitation,
  OrganizationInvitationStatus,
  OrganizationMemberRole,
  Prisma,
  TenantAuditAction,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import {
  IOrganizationInvitationRepository,
  ORGANIZATION_INVITATION_REPOSITORY,
} from './repositories/organization-invitation.repository.interface';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../members/repositories/organization-member.repository.interface';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../repositories/organization.repository.interface';

const INVITATION_TTL_DAYS = 14;

const MODERATOR_ROLES: UserRole[] = [
  UserRole.STEWARD,
  UserRole.PLATFORM_ADMINISTRATOR,
  UserRole.SYSTEM_ADMINISTRATOR,
];
const MANAGING_MEMBER_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
];

/**
 * Step 1 — Business Identity & Boundary §8: the full invitation lifecycle.
 *
 * An invitation is address-bound, not identity-bound, and never itself
 * grants access — only an explicit, email-matched acceptance creates an
 * OrganizationMember row. Every state transition (accept/decline/revoke) is
 * claimed with a conditional `updateMany` guarded on the invitation's
 * current status, so a replay (double-accept, accept-after-revoke,
 * concurrent accept) is rejected by the database itself rather than by an
 * earlier, racy read-then-write check in application code.
 */
@Injectable()
export class OrganizationInvitationsService {
  constructor(
    @Inject(ORGANIZATION_INVITATION_REPOSITORY)
    private readonly repo: IOrganizationInvitationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepo: IOrganizationMemberRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgRepo: IOrganizationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async invite(
    organizationId: string,
    dto: InviteMemberDto,
    caller: AuthenticatedUser,
  ): Promise<InvitationResponseDto> {
    await this.assertOrgExists(organizationId);
    await this.assertIsOrgAdminOrPrivileged(organizationId, caller);

    if (dto.role === OrganizationMemberRole.OWNER) {
      throw new BadRequestException(
        'Ownership is granted only through an explicit ownership transfer, not an invitation',
      );
    }

    const email = dto.email.trim();
    const conflictMessage = `An invitation to '${email}' is already pending for this organization`;

    // Fast, friendly path for the common (non-racing) case — but this
    // check-then-create is inherently raceable on its own, so it is
    // backed by a real database invariant below, not trusted alone
    // (Step 1 repair #5).
    const duplicate = await this.repo.findPendingByOrgAndEmail(organizationId, email);
    if (duplicate) {
      throw new ConflictException(conflictMessage);
    }

    const existingMember = await this.prisma.db.organizationMember.findFirst({
      where: { organizationId, user: { email: { equals: email, mode: 'insensitive' } } },
    });
    if (existingMember) {
      throw new ConflictException(`'${email}' is already a member of this organization`);
    }

    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    let invitation: OrganizationInvitation;
    try {
      invitation = await this.repo.create({
        organizationId,
        invitedEmail: email,
        role: dto.role ?? OrganizationMemberRole.MEMBER,
        invitedById: caller.id,
        expiresAt,
      });
    } catch (error) {
      // The database boundary's own enforcement (a partial unique index on
      // (organizationId, lower(invitedEmail)) WHERE status = 'PENDING') —
      // this is what actually closes the race the pre-check above cannot,
      // converted into the same conflict response a caller who lost the
      // pre-check would have seen.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(conflictMessage);
      }
      throw error;
    }

    await this.prisma.db.tenantAuditEvent.create({
      data: {
        organizationId,
        actorId: caller.id,
        action: TenantAuditAction.MEMBER_INVITED,
        resourceType: 'OrganizationInvitation',
        resourceId: invitation.id,
        context: { invitedEmail: email, role: invitation.role },
      },
    });

    return InvitationResponseDto.fromEntity(invitation);
  }

  async listForOrganization(
    organizationId: string,
    caller: AuthenticatedUser,
  ): Promise<InvitationResponseDto[]> {
    await this.assertOrgExists(organizationId);
    await this.assertIsOrgAdminOrPrivileged(organizationId, caller);

    const invitations = await this.repo.findByOrganization(organizationId);
    return invitations.map((i) => InvitationResponseDto.fromEntity(i));
  }

  /** Every invitation currently addressed to the caller's own account email. */
  async listMine(caller: AuthenticatedUser): Promise<InvitationResponseDto[]> {
    const pending = await this.repo.findPendingByEmail(caller.email);
    const active: OrganizationInvitation[] = [];

    for (const invitation of pending) {
      if (invitation.expiresAt.getTime() < Date.now()) {
        await this.claimTransition(invitation.id, OrganizationInvitationStatus.EXPIRED, {});
        continue;
      }
      active.push(invitation);
    }

    if (active.length === 0) return [];

    const organizations = await this.prisma.db.organization.findMany({
      where: { id: { in: [...new Set(active.map((i) => i.organizationId))] } },
      select: { id: true, name: true },
    });
    const nameById = new Map(organizations.map((o) => [o.id, o.name]));

    return active.map((i) => InvitationResponseDto.fromEntity(i, nameById.get(i.organizationId)));
  }

  async accept(invitationId: string, caller: AuthenticatedUser): Promise<InvitationResponseDto> {
    const invitation = await this.repo.findById(invitationId);
    if (!invitation) throw new NotFoundException(`Invitation '${invitationId}' not found`);
    this.assertAddressedToCaller(invitation, caller);

    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.claimTransition(invitation.id, OrganizationInvitationStatus.EXPIRED, {});
      throw new ConflictException('This invitation has expired');
    }
    if (invitation.status !== OrganizationInvitationStatus.PENDING) {
      throw new ConflictException(
        `This invitation has already been ${invitation.status.toLowerCase()}`,
      );
    }

    const result = await this.prisma.db.$transaction(async (tx) => {
      const claim = await tx.organizationInvitation.updateMany({
        where: { id: invitation.id, status: OrganizationInvitationStatus.PENDING },
        data: {
          status: OrganizationInvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedByUserId: caller.id,
        },
      });
      if (claim.count === 0) {
        throw new ConflictException('This invitation is no longer pending');
      }

      // A person may already have been added directly while an invitation
      // to the same address was also outstanding (§13 — simultaneous
      // invitation/acceptance edge cases). Accepting then resolves the
      // invitation without creating a duplicate, conflicting membership row.
      const existingMembership = await tx.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId: invitation.organizationId, userId: caller.id },
        },
      });
      if (!existingMembership) {
        await tx.organizationMember.create({
          data: {
            organizationId: invitation.organizationId,
            userId: caller.id,
            role: invitation.role,
          },
        });
      }

      await tx.tenantAuditEvent.create({
        data: {
          organizationId: invitation.organizationId,
          actorId: caller.id,
          action: TenantAuditAction.INVITATION_ACCEPTED,
          resourceType: 'OrganizationInvitation',
          resourceId: invitation.id,
          context: {
            invitedEmail: invitation.invitedEmail,
            role: invitation.role,
            alreadyMember: Boolean(existingMembership),
          },
        },
      });

      return tx.organizationInvitation.findUniqueOrThrow({ where: { id: invitation.id } });
    });

    return InvitationResponseDto.fromEntity(result);
  }

  async decline(invitationId: string, caller: AuthenticatedUser): Promise<InvitationResponseDto> {
    const invitation = await this.repo.findById(invitationId);
    if (!invitation) throw new NotFoundException(`Invitation '${invitationId}' not found`);
    this.assertAddressedToCaller(invitation, caller);

    const updated = await this.claimTransition(
      invitation.id,
      OrganizationInvitationStatus.DECLINED,
      { declinedAt: new Date() },
      invitation.status,
    );

    await this.prisma.db.tenantAuditEvent.create({
      data: {
        organizationId: invitation.organizationId,
        actorId: caller.id,
        action: TenantAuditAction.INVITATION_DECLINED,
        resourceType: 'OrganizationInvitation',
        resourceId: invitation.id,
        context: { invitedEmail: invitation.invitedEmail },
      },
    });

    return InvitationResponseDto.fromEntity(updated);
  }

  async revoke(
    organizationId: string,
    invitationId: string,
    caller: AuthenticatedUser,
  ): Promise<void> {
    await this.assertOrgExists(organizationId);
    await this.assertIsOrgAdminOrPrivileged(organizationId, caller);

    const invitation = await this.repo.findById(invitationId);
    // Deliberately indistinguishable from an absent invitation when it
    // belongs to a different organization — the same cross-tenant
    // identifier-probing defense used by BusinessTenantMembershipGuard.
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundException(`Invitation '${invitationId}' not found`);
    }

    const updated = await this.claimTransition(
      invitation.id,
      OrganizationInvitationStatus.REVOKED,
      { revokedAt: new Date(), revokedById: caller.id },
      invitation.status,
    );

    await this.prisma.db.tenantAuditEvent.create({
      data: {
        organizationId,
        actorId: caller.id,
        action: TenantAuditAction.INVITATION_REVOKED,
        resourceType: 'OrganizationInvitation',
        resourceId: updated.id,
        context: { invitedEmail: updated.invitedEmail },
      },
    });
  }

  // ── Internal helpers ──────────────────────────────────────────────────

  private assertAddressedToCaller(
    invitation: OrganizationInvitation,
    caller: AuthenticatedUser,
  ): void {
    if (invitation.invitedEmail.toLowerCase() !== caller.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was not addressed to your account email');
    }
  }

  /**
   * Atomically claims the PENDING → `next` transition via a conditional
   * `updateMany` (never a plain `update`, which would overwrite regardless
   * of the row's current status) so a concurrent or replayed request loses
   * the race deterministically instead of double-applying a side effect.
   */
  private async claimTransition(
    id: string,
    next: OrganizationInvitationStatus,
    data: Record<string, unknown>,
    knownCurrentStatus?: OrganizationInvitationStatus,
  ): Promise<OrganizationInvitation> {
    const claim = await this.prisma.db.organizationInvitation.updateMany({
      where: { id, status: OrganizationInvitationStatus.PENDING },
      data: { status: next, ...data },
    });
    if (claim.count === 0) {
      const current = knownCurrentStatus ?? (await this.repo.findById(id))?.status;
      throw new ConflictException(
        current
          ? `This invitation has already been ${current.toLowerCase()}`
          : 'This invitation is no longer pending',
      );
    }
    return this.prisma.db.organizationInvitation.findUniqueOrThrow({ where: { id } });
  }

  private async assertOrgExists(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findById(organizationId);
    if (!org) throw new NotFoundException(`Organization '${organizationId}' not found`);
  }

  private async assertIsOrgAdminOrPrivileged(
    organizationId: string,
    caller: AuthenticatedUser,
  ): Promise<void> {
    if (hasRole(caller, MODERATOR_ROLES)) return;

    const membership = await this.memberRepo.findByOrgAndUser(organizationId, caller.id);
    if (!membership || !MANAGING_MEMBER_ROLES.includes(membership.role)) {
      throw new ForbiddenException(
        "You do not have permission to manage this organization's invitations",
      );
    }
  }
}
