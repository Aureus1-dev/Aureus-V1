import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationMemberRole,
  OrganizationStatus,
  TenantAuditAction,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import type { Organization } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { hasRole } from '../auth/utils/has-role.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';
import { RejectOrganizationDto } from './dto/reject-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { PaginatedOrganizationsResponseDto } from './dto/paginated-organizations-response.dto';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from './repositories/organization.repository.interface';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from './members/repositories/organization-member.repository.interface';

const MODERATOR_ROLES: UserRole[] = [
  UserRole.STEWARD,
  UserRole.PLATFORM_ADMINISTRATOR,
  UserRole.SYSTEM_ADMINISTRATOR,
];
const MANAGEABLE_MEMBER_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
];

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repo: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepo: IOrganizationMemberRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────

  /**
   * Atomic (Step 1 §4 repair): row creation, reference assignment, founding
   * OWNER membership, and the ORGANIZATION_CREATED audit event all commit
   * or roll back together in one transaction. Before this repair these
   * were four separate writes — a failure between any two of them (e.g.
   * the audit-event insert) could leave a real, findable Organization row
   * with no OWNER and no audit trail. Bypasses the repository abstraction
   * deliberately, the same way transferOwnership() and invitation accept()
   * already do, because true cross-model atomicity needs one transaction
   * client shared across all four writes.
   */
  async create(
    dto: CreateOrganizationDto,
    caller: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    const org = await this.prisma.db.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: { ...dto, createdById: caller.id, lastUpdatedById: caller.id },
      });

      const organizationRef = `AUR-ORG-${created.sequenceNumber.toString().padStart(6, '0')}`;
      const updated = await tx.organization.update({
        where: { id: created.id },
        data: { organizationRef },
      });

      // The creator becomes the organization's initial authorized OWNER
      // (Step 1 — Business Identity & Boundary §2): ownership, not mere
      // administration, is the founding representative's role.
      await tx.organizationMember.create({
        data: { organizationId: created.id, userId: caller.id, role: OrganizationMemberRole.OWNER },
      });

      await tx.tenantAuditEvent.create({
        data: {
          organizationId: created.id,
          actorId: caller.id,
          action: TenantAuditAction.ORGANIZATION_CREATED,
          resourceType: 'Organization',
          resourceId: created.id,
          context: { organizationRef, organizationType: dto.organizationType },
        },
      });

      return updated;
    });

    this.logger.log(`Organization created: ${org.organizationRef} by ${caller.id}`);
    return OrganizationResponseDto.fromEntity(org);
  }

  // ── Read ──────────────────────────────────────────────────────────────

  async findAll(query: ListOrganizationsQueryDto): Promise<PaginatedOrganizationsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    // Default: only show VERIFIED organizations to the general audience.
    const verificationStatus = query.verificationStatus ?? VerificationStatus.VERIFIED;

    const result = await this.repo.findAll({
      page,
      limit,
      verificationStatus,
      q: query.q,
      organizationType: query.organizationType,
      country: query.country,
      state: query.state,
      city: query.city,
      status: query.status,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      data: result.data.map(OrganizationResponseDto.fromEntity),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<OrganizationResponseDto> {
    const org = await this.repo.findById(id);
    if (!org) throw new NotFoundException(`Organization '${id}' not found`);
    return OrganizationResponseDto.fromEntity(org);
  }

  async findByRef(organizationRef: string): Promise<OrganizationResponseDto> {
    const org = await this.repo.findByRef(organizationRef);
    if (!org) throw new NotFoundException(`Organization '${organizationRef}' not found`);
    return OrganizationResponseDto.fromEntity(org);
  }

  // ── Update ────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    caller: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    await this.getManageableOrThrow(id, caller);
    const updated = await this.repo.update(id, { ...dto, lastUpdatedById: caller.id });
    this.logger.log(`Organization updated: ${updated.organizationRef ?? id} by ${caller.id}`);
    return OrganizationResponseDto.fromEntity(updated);
  }

  // ── Soft delete ───────────────────────────────────────────────────────

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    const existing = await this.getManageableOrThrow(id, caller);
    await this.repo.softDelete(id);
    this.logger.log(`Organization soft-deleted: ${existing.organizationRef ?? id} by ${caller.id}`);
  }

  // ── Verification Workflow ────────────────────────────────────────────

  /** Move DRAFT → PENDING_REVIEW. Org ADMIN, Steward, or Admin may submit. */
  async submitForReview(id: string, caller: AuthenticatedUser): Promise<OrganizationResponseDto> {
    const org = await this.getManageableOrThrow(id, caller);

    if (org.verificationStatus !== VerificationStatus.DRAFT) {
      throw new ConflictException(
        `Organization is in '${org.verificationStatus}' status. Only DRAFT organizations can be submitted for review.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.PENDING_REVIEW,
      status: OrganizationStatus.DRAFT,
      lastUpdatedById: caller.id,
    });

    this.logger.log(
      `Organization submitted for review: ${org.organizationRef ?? id} by ${caller.id}`,
    );
    return OrganizationResponseDto.fromEntity(updated);
  }

  /** Move PENDING_REVIEW → VERIFIED. Steward/Admin only (enforced by controller guard). */
  async verify(id: string, caller: AuthenticatedUser): Promise<OrganizationResponseDto> {
    const org = await this.repo.findById(id);
    if (!org) throw new NotFoundException(`Organization '${id}' not found`);

    if (org.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Organization is in '${org.verificationStatus}' status. Only PENDING_REVIEW organizations can be verified.`,
      );
    }

    const now = new Date();
    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.VERIFIED,
      status: OrganizationStatus.ACTIVE,
      dateLastVerified: now,
      datePublished: org.datePublished ?? now,
      rejectionReason: null,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Organization verified: ${org.organizationRef ?? id} by ${caller.id}`);
    return OrganizationResponseDto.fromEntity(updated);
  }

  /** Move PENDING_REVIEW → REJECTED. Steward/Admin only (enforced by controller guard). */
  async reject(
    id: string,
    dto: RejectOrganizationDto,
    caller: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    const org = await this.repo.findById(id);
    if (!org) throw new NotFoundException(`Organization '${id}' not found`);

    if (org.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Organization is in '${org.verificationStatus}' status. Only PENDING_REVIEW organizations can be rejected.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.REJECTED,
      status: OrganizationStatus.DRAFT,
      rejectionReason: dto.rejectionReason,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Organization rejected: ${org.organizationRef ?? id} by ${caller.id}`);
    return OrganizationResponseDto.fromEntity(updated);
  }

  /** Archive an organization regardless of current status. Org ADMIN, Steward, or Admin. */
  async archive(id: string, caller: AuthenticatedUser): Promise<OrganizationResponseDto> {
    const org = await this.getManageableOrThrow(id, caller);

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.ARCHIVED,
      status: OrganizationStatus.ARCHIVED,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Organization archived: ${org.organizationRef ?? id} by ${caller.id}`);
    return OrganizationResponseDto.fromEntity(updated);
  }

  // ── Authorization helper ─────────────────────────────────────────────

  /**
   * Loads an organization and enforces management authority (PA-018): an
   * ADMIN representative of the organization may manage it, and
   * Stewards/Admins may manage any organization regardless of membership
   * (moderation authority).
   */
  private async getManageableOrThrow(id: string, caller: AuthenticatedUser): Promise<Organization> {
    const org = await this.repo.findById(id);
    if (!org) throw new NotFoundException(`Organization '${id}' not found`);

    if (hasRole(caller, MODERATOR_ROLES)) return org;

    const membership = await this.memberRepo.findByOrgAndUser(id, caller.id);
    if (!membership || !MANAGEABLE_MEMBER_ROLES.includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to manage this organization');
    }

    return org;
  }
}
