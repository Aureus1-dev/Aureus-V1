import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationMemberRole, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from './repositories/organization-member.repository.interface';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../repositories/organization.repository.interface';

const MODERATOR_ROLES: UserRole[] = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@Injectable()
export class OrganizationMembersService {
  constructor(
    @Inject(ORGANIZATION_MEMBER_REPOSITORY) private readonly repo: IOrganizationMemberRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgRepo: IOrganizationRepository,
  ) {}

  async add(organizationId: string, dto: AddMemberDto, caller: AuthenticatedUser): Promise<MemberResponseDto> {
    await this.assertOrgExists(organizationId);
    await this.assertIsOrgAdminOrPrivileged(organizationId, caller);

    const existing = await this.repo.findByOrgAndUser(organizationId, dto.userId);
    if (existing) {
      throw new ConflictException(`User '${dto.userId}' is already a member of this organization`);
    }

    const member = await this.repo.add({
      organizationId,
      userId: dto.userId,
      role: dto.role ?? OrganizationMemberRole.MEMBER,
    });
    return MemberResponseDto.fromEntity(member);
  }

  async findByOrganization(organizationId: string, caller: AuthenticatedUser): Promise<MemberResponseDto[]> {
    await this.assertOrgExists(organizationId);

    if (!hasRole(caller, MODERATOR_ROLES)) {
      const membership = await this.repo.findByOrgAndUser(organizationId, caller.id);
      if (!membership) {
        throw new ForbiddenException('You do not have permission to view this organization\'s members');
      }
    }

    const members = await this.repo.findByOrganization(organizationId);
    return members.map(MemberResponseDto.fromEntity);
  }

  async updateRole(
    organizationId: string, userId: string, dto: UpdateMemberDto, caller: AuthenticatedUser,
  ): Promise<MemberResponseDto> {
    await this.assertOrgExists(organizationId);
    await this.assertIsOrgAdminOrPrivileged(organizationId, caller);

    const target = await this.repo.findByOrgAndUser(organizationId, userId);
    if (!target) throw new NotFoundException(`User '${userId}' is not a member of this organization`);

    if (target.role === OrganizationMemberRole.ADMIN && dto.role !== OrganizationMemberRole.ADMIN) {
      const adminCount = await this.repo.countAdmins(organizationId);
      if (adminCount <= 1) {
        throw new ConflictException('Cannot demote the organization\'s last remaining ADMIN representative');
      }
    }

    const updated = await this.repo.updateRole(organizationId, userId, dto.role);
    return MemberResponseDto.fromEntity(updated);
  }

  async remove(organizationId: string, userId: string, caller: AuthenticatedUser): Promise<void> {
    await this.assertOrgExists(organizationId);

    const isSelf = caller.id === userId;
    if (!isSelf) {
      await this.assertIsOrgAdminOrPrivileged(organizationId, caller);
    }

    const target = await this.repo.findByOrgAndUser(organizationId, userId);
    if (!target) throw new NotFoundException(`User '${userId}' is not a member of this organization`);

    if (target.role === OrganizationMemberRole.ADMIN) {
      const adminCount = await this.repo.countAdmins(organizationId);
      if (adminCount <= 1) {
        throw new ConflictException('Cannot remove the organization\'s last remaining ADMIN representative');
      }
    }

    await this.repo.remove(organizationId, userId);
  }

  private async assertOrgExists(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findById(organizationId);
    if (!org) throw new NotFoundException(`Organization '${organizationId}' not found`);
  }

  private async assertIsOrgAdminOrPrivileged(organizationId: string, caller: AuthenticatedUser): Promise<void> {
    if (hasRole(caller, MODERATOR_ROLES)) return;

    const membership = await this.repo.findByOrgAndUser(organizationId, caller.id);
    if (!membership || membership.role !== OrganizationMemberRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to manage this organization\'s members');
    }
  }
}
