import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessPublicStatus,
  OrganizationMemberRole,
  OrganizationType,
  Prisma,
  TenantAuditAction,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { hasRole } from '../auth/utils/has-role.util';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertBusinessProfileDto } from './dto/upsert-business-profile.dto';

const MANAGER_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
];

const PRIVILEGED_ROLES: UserRole[] = [
  UserRole.STEWARD,
  UserRole.PLATFORM_ADMINISTRATOR,
  UserRole.SYSTEM_ADMINISTRATOR,
];

@Injectable()
export class BusinessTenantService {
  constructor(private readonly prisma: PrismaService) {}

  async getConsole(organizationId: string, caller: AuthenticatedUser) {
    const access = await this.getTenantAccessOrThrow(organizationId, caller);
    return {
      tenantId: access.organization.id,
      tenantVersion: access.organization.tenantVersion,
      organization: access.organization,
      profile: access.organization.businessProfile,
      membershipRole: access.membership?.role ?? null,
      canManage: hasRole(caller, PRIVILEGED_ROLES)
        || (access.membership ? MANAGER_ROLES.includes(access.membership.role) : false),
    };
  }

  async upsertProfile(
    organizationId: string,
    dto: UpsertBusinessProfileDto,
    caller: AuthenticatedUser,
  ) {
    const access = await this.getTenantAccessOrThrow(organizationId, caller);
    this.assertCanManage(access.membership?.role, caller);

    const existing = access.organization.businessProfile;
    const nextStep = dto.onboardingStep ?? existing?.onboardingStep ?? 0;
    const nextStatus = dto.publicStatus ?? existing?.publicStatus ?? BusinessPublicStatus.PRIVATE;
    const nextSlug = dto.publicSlug ?? existing?.publicSlug ?? null;
    const nextEscalation = dto.escalationTarget ?? existing?.escalationTarget ?? null;
    const nextRoutes = dto.contactRoutes ?? (existing?.contactRoutes as unknown[] | undefined) ?? [];

    if (nextStatus === BusinessPublicStatus.PUBLISHED) {
      if (access.organization.verificationStatus !== VerificationStatus.VERIFIED) {
        throw new ConflictException('Only a verified business tenant can be published');
      }
      if (nextStep !== 5) {
        throw new ConflictException('Complete business onboarding before publishing');
      }
    }

    if (nextStep === 5 && (!nextSlug || nextRoutes.length === 0 || !nextEscalation)) {
      throw new ConflictException(
        'Completing onboarding requires a public slug, at least one contact route, and an escalation target',
      );
    }

    const completedNow = nextStep === 5 && existing?.onboardingCompletedAt == null;
    const json = (value: unknown): Prisma.InputJsonValue =>
      JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

    return this.prisma.db.$transaction(async (tx) => {
      const profile = await tx.businessProfile.upsert({
        where: { organizationId },
        create: {
          organizationId,
          publicSlug: nextSlug,
          publicStatus: nextStatus,
          serviceArea: json(dto.serviceArea),
          businessHours: json(dto.businessHours),
          contactRoutes: json(dto.contactRoutes),
          ...(dto.escalationTarget !== undefined && { escalationTarget: json(dto.escalationTarget) }),
          onboardingStep: nextStep,
          ...(completedNow && { onboardingCompletedAt: new Date() }),
        },
        update: {
          ...(dto.publicSlug !== undefined && { publicSlug: dto.publicSlug }),
          ...(dto.publicStatus !== undefined && { publicStatus: dto.publicStatus }),
          serviceArea: json(dto.serviceArea),
          businessHours: json(dto.businessHours),
          contactRoutes: json(dto.contactRoutes),
          ...(dto.escalationTarget !== undefined && { escalationTarget: json(dto.escalationTarget) }),
          ...(dto.onboardingStep !== undefined && { onboardingStep: dto.onboardingStep }),
          ...(completedNow && { onboardingCompletedAt: new Date() }),
        },
      });

      await tx.tenantAuditEvent.create({
        data: {
          organizationId,
          actorId: caller.id,
          action: completedNow
            ? TenantAuditAction.ONBOARDING_COMPLETED
            : existing
              ? TenantAuditAction.PROFILE_UPDATED
              : TenantAuditAction.PROFILE_CREATED,
          resourceType: 'BusinessProfile',
          resourceId: profile.id,
          context: {
            changedFields: Object.keys(dto).sort(),
            tenantVersion: access.organization.tenantVersion,
          },
        },
      });

      return profile;
    });
  }

  async listAudit(organizationId: string, caller: AuthenticatedUser) {
    const access = await this.getTenantAccessOrThrow(organizationId, caller);
    this.assertCanManage(access.membership?.role, caller);

    return this.prisma.db.tenantAuditEvent.findMany({
      where: { organizationId },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
  }

  private async getTenantAccessOrThrow(organizationId: string, caller: AuthenticatedUser) {
    const organization = await this.prisma.db.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      include: {
        businessProfile: true,
        members: { where: { userId: caller.id }, take: 1 },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization '${organizationId}' not found`);
    }
    if (organization.organizationType !== OrganizationType.BUSINESS) {
      throw new ConflictException('The business console is available only to BUSINESS organizations');
    }

    const membership = organization.members[0] ?? null;
    if (!membership && !hasRole(caller, PRIVILEGED_ROLES)) {
      // Deliberately indistinguishable from a missing tenant to prevent
      // cross-tenant identifier probing.
      throw new NotFoundException(`Organization '${organizationId}' not found`);
    }

    return { organization, membership };
  }

  private assertCanManage(
    role: OrganizationMemberRole | undefined,
    caller: AuthenticatedUser,
  ): void {
    if (hasRole(caller, PRIVILEGED_ROLES)) return;
    if (!role || !MANAGER_ROLES.includes(role)) {
      throw new ForbiddenException('You do not have permission to manage this business tenant');
    }
  }
}
