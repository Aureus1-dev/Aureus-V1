import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ResourceStatus, UserRole, VerificationStatus } from '@prisma/client';
import type { Resource } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { RejectResourceDto } from './dto/reject-resource.dto';
import { ResourceResponseDto } from './dto/resource-response.dto';
import { PaginatedResourcesResponseDto } from './dto/paginated-resources-response.dto';
import {
  IResourceRepository,
  RESOURCE_REPOSITORY,
} from './repositories/resource.repository.interface';
import { ResourceScoringService } from './scoring/resource-scoring.service';

const MANAGE_ANY_ROLES: UserRole[] = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR];

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY) private readonly repo: IResourceRepository,
    private readonly scoring: ResourceScoringService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────

  async create(dto: CreateResourceDto, caller: AuthenticatedUser): Promise<ResourceResponseDto> {
    const confidenceScore = this.scoring.computeConfidence({
      ...dto,
      verificationStatus: VerificationStatus.DRAFT,
    });

    const resource = await this.repo.create({
      ...dto,
      ownerId: caller.id,
      submittedById: caller.id,
      createdById: caller.id,
      lastUpdatedById: caller.id,
      confidenceScore,
      freshnessScore: 0,
    });

    const resourceRef = `AUR-RES-${resource.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.repo.setRef(resource.id, resourceRef);

    this.logger.log(`Resource created: ${resourceRef} by ${caller.id}`);
    return ResourceResponseDto.fromEntity(updated);
  }

  // ── Read ──────────────────────────────────────────────────────────────

  async findAll(query: ListResourcesQueryDto): Promise<PaginatedResourcesResponseDto> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;
    // Default: only show VERIFIED resources to the general audience.
    const verificationStatus = query.verificationStatus ?? VerificationStatus.VERIFIED;

    const result = await this.repo.findAll({
      page, limit, verificationStatus,
      q:            query.q,
      category:     query.category,
      resourceType: query.resourceType,
      location:     query.location,
      country:      query.country,
      state:        query.state,
      city:         query.city,
      isRemote:     query.isRemote,
      tags:         query.tags,
      status:       query.status,
      ownerId:      query.ownerId,
      sortBy:       query.sortBy,
      sortOrder:    query.sortOrder,
    });

    return {
      data:       result.data.map(ResourceResponseDto.fromEntity),
      total:      result.total,
      page:       result.page,
      limit:      result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<ResourceResponseDto> {
    const resource = await this.repo.findById(id);
    if (!resource) throw new NotFoundException(`Resource '${id}' not found`);
    return ResourceResponseDto.fromEntity(resource);
  }

  async findByRef(resourceRef: string): Promise<ResourceResponseDto> {
    const resource = await this.repo.findByRef(resourceRef);
    if (!resource) throw new NotFoundException(`Resource '${resourceRef}' not found`);
    return ResourceResponseDto.fromEntity(resource);
  }

  // ── Update ────────────────────────────────────────────────────────────

  async update(
    id: string, dto: UpdateResourceDto, caller: AuthenticatedUser,
  ): Promise<ResourceResponseDto> {
    const existing = await this.getOwnedOrThrow(id, caller);

    const merged = { ...existing, ...dto };
    const confidenceScore = this.scoring.computeConfidence(merged);
    const freshnessScore  = this.scoring.computeFreshness({ ...merged, updatedAt: new Date() });

    const updated = await this.repo.update(id, {
      ...dto,
      confidenceScore,
      freshnessScore,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Resource updated: ${updated.resourceRef ?? id} by ${caller.id}`);
    return ResourceResponseDto.fromEntity(updated);
  }

  // ── Soft delete ───────────────────────────────────────────────────────

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    const existing = await this.getOwnedOrThrow(id, caller);
    await this.repo.softDelete(id);
    this.logger.log(`Resource soft-deleted: ${existing.resourceRef ?? id} by ${caller.id}`);
  }

  // ── Verification Workflow ────────────────────────────────────────────

  /** Move DRAFT → PENDING_REVIEW. Owner, Steward, or Admin may submit. */
  async submitForReview(id: string, caller: AuthenticatedUser): Promise<ResourceResponseDto> {
    const resource = await this.getOwnedOrThrow(id, caller);

    if (resource.verificationStatus !== VerificationStatus.DRAFT) {
      throw new ConflictException(
        `Resource is in '${resource.verificationStatus}' status. Only DRAFT resources can be submitted for review.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.PENDING_REVIEW,
      status:              ResourceStatus.DRAFT,
      lastUpdatedById:     caller.id,
    });

    this.logger.log(`Resource submitted for review: ${resource.resourceRef ?? id} by ${caller.id}`);
    return ResourceResponseDto.fromEntity(updated);
  }

  /** Move PENDING_REVIEW → VERIFIED. Steward/Admin only (enforced by controller guard). */
  async verify(id: string, caller: AuthenticatedUser): Promise<ResourceResponseDto> {
    const resource = await this.repo.findById(id);
    if (!resource) throw new NotFoundException(`Resource '${id}' not found`);

    if (resource.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Resource is in '${resource.verificationStatus}' status. Only PENDING_REVIEW resources can be verified.`,
      );
    }

    const now = new Date();
    const withVerification = {
      ...resource, verificationStatus: VerificationStatus.VERIFIED,
      dateLastVerified: now, updatedAt: now,
    };
    const confidenceScore = this.scoring.computeConfidence(withVerification);
    const freshnessScore  = this.scoring.computeFreshness(withVerification);

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.VERIFIED,
      status:              ResourceStatus.ACTIVE,
      dateLastVerified:    now,
      datePublished:       resource.datePublished ?? now,
      confidenceScore,
      freshnessScore,
      rejectionReason:     null,
      lastUpdatedById:     caller.id,
    });

    this.logger.log(`Resource verified: ${resource.resourceRef ?? id} by ${caller.id}`);
    return ResourceResponseDto.fromEntity(updated);
  }

  /** Move PENDING_REVIEW → REJECTED. Steward/Admin only (enforced by controller guard). */
  async reject(id: string, dto: RejectResourceDto, caller: AuthenticatedUser): Promise<ResourceResponseDto> {
    const resource = await this.repo.findById(id);
    if (!resource) throw new NotFoundException(`Resource '${id}' not found`);

    if (resource.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Resource is in '${resource.verificationStatus}' status. Only PENDING_REVIEW resources can be rejected.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.REJECTED,
      status:              ResourceStatus.DRAFT,
      rejectionReason:     dto.rejectionReason,
      lastUpdatedById:     caller.id,
    });

    this.logger.log(`Resource rejected: ${resource.resourceRef ?? id} by ${caller.id}`);
    return ResourceResponseDto.fromEntity(updated);
  }

  /** Archive a resource regardless of current status. Owner, Steward, or Admin. */
  async archive(id: string, caller: AuthenticatedUser): Promise<ResourceResponseDto> {
    const resource = await this.getOwnedOrThrow(id, caller);

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.ARCHIVED,
      status:              ResourceStatus.ARCHIVED,
      lastUpdatedById:     caller.id,
    });

    this.logger.log(`Resource archived: ${resource.resourceRef ?? id} by ${caller.id}`);
    return ResourceResponseDto.fromEntity(updated);
  }

  // ── Authorization helper ─────────────────────────────────────────────

  /**
   * Loads a resource and enforces organization ownership (PA-018): the
   * listing's owner may manage it, and Stewards/Admins may manage any
   * listing regardless of ownership (moderation authority).
   */
  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser): Promise<Resource> {
    const resource = await this.repo.findById(id);
    if (!resource) throw new NotFoundException(`Resource '${id}' not found`);

    const isOwner = resource.ownerId === caller.id;
    const isPrivileged = caller.roles.some((role) => MANAGE_ANY_ROLES.includes(role as UserRole));

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to manage this resource');
    }

    return resource;
  }
}

