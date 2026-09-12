import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationMemberRole, Prisma, TenantAuditAction, UserRole } from '@prisma/client';
import type { OrganizationMember } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from './repositories/organization-member.repository.interface';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../repositories/organization.repository.interface';

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
export class OrganizationMembersService {
  constructor(
    @Inject(ORGANIZATION_MEMBER_REPOSITORY) private readonly repo: IOrganizationMemberRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgRepo: IOrganizationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async add(
    organizationId: string,
    dto: AddMemberDto,
    caller: AuthenticatedUser,
  ): Promise<MemberResponseDto> {
    await this.assertOrgExists(organizationId);
    await this.assertIsOrgAdminOrPrivileged(organizationId, caller);

    const existing = await this.repo.findByOrgAndUser(organizationId, dto.userId);
    if (existing) {
      throw new ConflictException(`User '${dto.userId}' is already a member of this organization`);
    }

    const role = dto.role ?? OrganizationMemberRole.MEMBER;
    const member = await this.repo.add({ organizationId, userId: dto.userId, role });

    await this.audit(organizationId, caller.id, TenantAuditAction.MEMBER_ADDED, member.id, {
      userId: dto.userId,
      role,
    });

    return MemberResponseDto.fromEntity(member);
  }

  async findByOrganization(
    organizationId: string,
    caller: AuthenticatedUser,
  ): Promise<MemberResponseDto[]> {
    await this.assertOrgExists(organizationId);

    if (!hasRole(caller, MODERATOR_ROLES)) {
      const membership = await this.repo.findByOrgAndUser(organizationId, caller.id);
      if (!membership) {
        throw new ForbiddenException(
          "You do not have permission to view this organization's members",
        );
      }
    }

    const members = await this.repo.findByOrganization(organizationId);
    return members.map(MemberResponseDto.fromEntity);
  }

  async updateRole(
    organizationId: string,
    userId: string,
    dto: UpdateMemberDto,
    caller: AuthenticatedUser,
  ): Promise<MemberResponseDto> {
    await this.assertOrgExists(organizationId);
    await this.assertIsOrgAdminOrPrivileged(organizationId, caller);

    // Granting OWNER is not an ordinary role edit: only an existing OWNER
    // (or a platform moderator) may hand it out, so an ADMIN can never
    // unilaterally promote themselves or anyone else to OWNER (§16 —
    // privilege escalation). A deliberate hand-off also uses this same
    // check via transferOwnership(), which additionally keeps the org from
    // ending up with an unintended second OWNER.
    if (dto.role === OrganizationMemberRole.OWNER) {
      await this.assertIsOwnerOrPrivileged(organizationId, caller);
    }

    const target = await this.repo.findByOrgAndUser(organizationId, userId);
    if (!target)
      throw new NotFoundException(`User '${userId}' is not a member of this organization`);

    if (MANAGING_MEMBER_ROLES.includes(target.role) && !MANAGING_MEMBER_ROLES.includes(dto.role)) {
      const adminCount = await this.repo.countAdmins(organizationId);
      if (adminCount <= 1) {
        throw new ConflictException(
          "Cannot demote the organization's last remaining ADMIN representative",
        );
      }
    }

    // Ownership safety (Step 1 §10): distinct from — and stricter than —
    // the ADMIN+OWNER union check above. An org with one OWNER and several
    // ADMINs must not be able to demote that OWNER away just because
    // ADMINs remain; ownership must move through an explicit transfer.
    if (target.role === OrganizationMemberRole.OWNER && dto.role !== OrganizationMemberRole.OWNER) {
      const ownerCount = await this.repo.countOwners(organizationId);
      if (ownerCount <= 1) {
        throw new ConflictException(
          "Cannot demote the organization's sole owner — transfer ownership to another member first",
        );
      }
    }

    const updated = await this.repo.updateRole(organizationId, userId, dto.role);

    await this.audit(organizationId, caller.id, TenantAuditAction.MEMBER_ROLE_CHANGED, updated.id, {
      userId,
      fromRole: target.role,
      toRole: dto.role,
    });

    return MemberResponseDto.fromEntity(updated);
  }

  async remove(organizationId: string, userId: string, caller: AuthenticatedUser): Promise<void> {
    await this.assertOrgExists(organizationId);

    const isSelf = caller.id === userId;
    if (!isSelf) {
      await this.assertIsOrgAdminOrPrivileged(organizationId, caller);
    }

    const target = await this.repo.findByOrgAndUser(organizationId, userId);
    if (!target)
      throw new NotFoundException(`User '${userId}' is not a member of this organization`);

    if (MANAGING_MEMBER_ROLES.includes(target.role)) {
      const adminCount = await this.repo.countAdmins(organizationId);
      if (adminCount <= 1) {
        throw new ConflictException(
          "Cannot remove the organization's last remaining ADMIN representative",
        );
      }
    }

    // Ownership safety (Step 1 §10): applies even to self-removal — "leave
    // only where ownership rules permit". A sole owner leaving (or being
    // removed) would orphan the company; they must transfer ownership or
    // use an explicitly supported dissolution process first.
    if (target.role === OrganizationMemberRole.OWNER) {
      const ownerCount = await this.repo.countOwners(organizationId);
      if (ownerCount <= 1) {
        throw new ConflictException(
          "Cannot remove the organization's sole owner — transfer ownership to another member first",
        );
      }
    }

    await this.repo.remove(organizationId, userId);

    await this.audit(organizationId, caller.id, TenantAuditAction.MEMBER_REMOVED, target.id, {
      userId,
      role: target.role,
      self: isSelf,
    });
  }

  /**
   * Deliberate ownership hand-off (Step 1 §10/§11): promotes an existing
   * member to OWNER and, if the caller was themselves the OWNER, demotes
   * the caller to ADMIN in the same transaction — so a transfer can never
   * leave the organization with zero owners, and never silently creates an
   * unintended second one either. Restricted to the current OWNER (or a
   * platform moderator) — see updateRole()'s OWNER-grant guard.
   */
  async transferOwnership(
    organizationId: string,
    dto: TransferOwnershipDto,
    caller: AuthenticatedUser,
  ): Promise<MemberResponseDto> {
    await this.assertOrgExists(organizationId);
    const callerMembership = await this.assertIsOwnerOrPrivileged(organizationId, caller);

    const target = await this.repo.findByOrgAndUser(organizationId, dto.newOwnerUserId);
    if (!target) {
      throw new NotFoundException(
        `User '${dto.newOwnerUserId}' is not a member of this organization`,
      );
    }
    if (target.role === OrganizationMemberRole.OWNER) {
      throw new ConflictException(
        `User '${dto.newOwnerUserId}' is already an OWNER of this organization`,
      );
    }

    const demoteCaller = Boolean(
      callerMembership &&
      callerMembership.role === OrganizationMemberRole.OWNER &&
      callerMembership.userId !== dto.newOwnerUserId,
    );

    const newOwner = await this.prisma.db.$transaction(async (tx) => {
      const updated = await tx.organizationMember.update({
        where: { organizationId_userId: { organizationId, userId: dto.newOwnerUserId } },
        data: { role: OrganizationMemberRole.OWNER },
      });

      if (demoteCaller) {
        await tx.organizationMember.update({
          where: { organizationId_userId: { organizationId, userId: caller.id } },
          data: { role: OrganizationMemberRole.ADMIN },
        });
      }

      await tx.tenantAuditEvent.create({
        data: {
          organizationId,
          actorId: caller.id,
          action: TenantAuditAction.OWNERSHIP_TRANSFERRED,
          resourceType: 'OrganizationMember',
          resourceId: updated.id,
          context: {
            fromUserId: caller.id,
            toUserId: dto.newOwnerUserId,
            callerDemotedToAdmin: demoteCaller,
          },
        },
      });

      return updated;
    });

    return MemberResponseDto.fromEntity(newOwner);
  }

  private async audit(
    organizationId: string,
    actorId: string,
    action: TenantAuditAction,
    resourceId: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.db.tenantAuditEvent.create({
      data: {
        organizationId,
        actorId,
        action,
        resourceType: 'OrganizationMember',
        resourceId,
        context: JSON.parse(JSON.stringify(context)) as Prisma.InputJsonValue,
      },
    });
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

    const membership = await this.repo.findByOrgAndUser(organizationId, caller.id);
    if (!membership || !MANAGING_MEMBER_ROLES.includes(membership.role)) {
      throw new ForbiddenException(
        "You do not have permission to manage this organization's members",
      );
    }
  }

  /** Returns the caller's own membership (or null for a privileged, non-member moderator). */
  private async assertIsOwnerOrPrivileged(
    organizationId: string,
    caller: AuthenticatedUser,
  ): Promise<OrganizationMember | null> {
    if (hasRole(caller, MODERATOR_ROLES)) {
      return this.repo.findByOrgAndUser(organizationId, caller.id);
    }

    const membership = await this.repo.findByOrgAndUser(organizationId, caller.id);
    if (!membership || membership.role !== OrganizationMemberRole.OWNER) {
      throw new ForbiddenException("Only the organization's current OWNER may perform this action");
    }
    return membership;
  }
}
