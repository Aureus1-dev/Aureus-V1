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
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const duplicate = await this.repo.findPendingByOrgAndEmail(organizationId, email);
    if (duplicate && duplicate.expiresAt.getTime() >= now.getTime()) {
      throw new ConflictException(conflictMessage);
    }

    // An untouched invitation can still be status=PENDING after its TTL has
    // elapsed. Re-inviting must not depend on the recipient first opening
    // Aureus. Retire that stale row and create the replacement atomically.
    if (duplicate) {
      let invitation: OrganizationInvitation;
      try {
        invitation = await this.prisma.db.$transaction(async (tx) => {
          await tx.organizationInvitation.updateMany({
            where: {
              id: duplicate.id,
              organizationId,
              status: OrganizationInvitationStatus.PENDING,
              expiresAt: { lt: now },
            },
            data: { status: OrganizationInvitationStatus.EXPIRED },
          });

          // If another resend transaction won while this one waited on the
          // stale row, observe its fresh PENDING invitation and lose cleanly.
          const active = await tx.organizationInvitation.findFirst({
            where: {
              organizationId,
              status: OrganizationInvitationStatus.PENDING,
              invitedEmail: { equals: email, mode: 'insensitive' },
            },
            select: { id: true },
          });
          if (active) throw new ConflictException(conflictMessage);

          const existingMember = await tx.organizationMember.findFirst({
            where: { organizationId, user: { email: { equals: email, mode: 'insensitive' } } },
            select: { id: true },
          });
          if (existingMember) {
            throw new ConflictException(`'${email}' is already a member of this organization`);
          }

          const created = await tx.organizationInvitation.create({
            data: {
              organizationId,
              invitedEmail: email,
              role: dto.role ?? OrganizationMemberRole.MEMBER,
              invitedById: caller.id,
              expiresAt,
            },
          });

          await tx.tenantAuditEvent.create({
            data: {
              organizationId,
              actorId: caller.id,
              action: TenantAuditAction.MEMBER_INVITED,
              resourceType: 'OrganizationInvitation',
              resourceId: created.id,
              context: { invitedEmail: email, role: created.role },
            },
          });
          return created;
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException(conflictMessage);
        }
        throw error;
      }
      return InvitationResponseDto.fromEntity(invitation);
    }

    // Normal invite path stays on the established repository abstraction.
    // The PostgreSQL partial unique index remains the final race boundary.
    const existingMember = await this.prisma.db.organizationMember.findFirst({
      where: { organizationId, user: { email: { equals: email, mode: 'insensitive' } } },
    });
    if (existingMember) {
      throw new ConflictException(`'${email}' is already a member of this organization`);
    }

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

  private assertAddressedToCaller(
    invitation: OrganizationInvitation,
    caller: AuthenticatedUser,
  ): void {
    if (invitation.invitedEmail.toLowerCase() !== caller.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was not addressed to your account email');
    }
  }

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
