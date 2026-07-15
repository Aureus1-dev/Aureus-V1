import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationMemberRole, OrganizationStatus, UserRole, VerificationStatus } from '@prisma/client';
import type { Organization } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { hasRole } from '../auth/utils/has-role.util';
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

const MODERATOR_ROLES: UserRole[] = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repo: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY) private readonly memberRepo: IOrganizationMemberRepository,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────

  async create(dto: CreateOrganizationDto, caller: AuthenticatedUser): Promise<OrganizationResponseDto> {
    const org = await this.repo.create({
      ...dto,
      createdById: caller.id,
      lastUpdatedById: caller.id,
    });

    const organizationRef = `AUR-ORG-${org.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.repo.setRef(org.id, organizationRef);

    // The creator becomes the organization's first ADMIN representative.
    await this.memberRepo.add({ organizationId: org.id, userId: caller.id, role: OrganizationMemberRole.ADMIN });

    this.logger.log(`Organization created: ${organizationRef} by ${caller.id}`);
    return OrganizationResponseDto.fromEntity(updated);
  }

  // ── Read ──────────────────────────────────────────────────────────────

  async findAll(query: ListOrganizationsQueryDto): Promise<PaginatedOrganizationsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    // Default: only show VERIFIED organizations to the general audience.
    const verificationStatus = query.verificationStatus ?? VerificationStatus.VERIFIED;

    const result = await this.repo.findAll({
      page, limit, verificationStatus,
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
      total: result.total, page: result.page, limit: result.limit,
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
    id: string, dto: UpdateOrganizationDto, caller: AuthenticatedUser,
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

    this.logger.log(`Organization submitted for review: ${org.organizationRef ?? id} by ${caller.id}`);
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
  async reject(id: string, dto: RejectOrganizationDto, caller: AuthenticatedUser): Promise<OrganizationResponseDto> {
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
    if (!membership || membership.role !== OrganizationMemberRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to manage this organization');
    }

    return org;
  }
}
