import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { VerificationStatus, OpportunityStatus } from '@prisma/client';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { ListOpportunitiesQueryDto } from './dto/list-opportunities-query.dto';
import { RejectOpportunityDto } from './dto/reject-opportunity.dto';
import { VerifyOpportunityDto } from './dto/verify-opportunity.dto';
import { OpportunityResponseDto } from './dto/opportunity-response.dto';
import { PaginatedOpportunitiesResponseDto } from './dto/paginated-opportunities-response.dto';
import {
  IOpportunityRepository,
  OPPORTUNITY_REPOSITORY,
} from './repositories/opportunity.repository.interface';
import { OpportunityScoringService } from './scoring/opportunity-scoring.service';

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    @Inject(OPPORTUNITY_REPOSITORY) private readonly repo: IOpportunityRepository,
    private readonly scoring: OpportunityScoringService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateOpportunityDto): Promise<OpportunityResponseDto> {
    const deadline = dto.deadline ? new Date(dto.deadline) : undefined;

    // Compute initial confidence (no verification yet)
    const confidenceScore = this.scoring.computeConfidence({
      ...dto, deadline,
      verificationStatus: VerificationStatus.DRAFT,
    });

    const opp = await this.repo.create({
      ...dto,
      deadline,
      lastUpdatedById: dto.createdById,
      confidenceScore,
      freshnessScore: 0,
    });

    // Set the stable human-readable reference
    const opportunityRef = `AUR-OPP-${opp.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.repo.setRef(opp.id, opportunityRef);

    this.logger.log(`Opportunity created: ${opportunityRef} by ${dto.createdById}`);
    return OpportunityResponseDto.fromEntity(updated);
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async findAll(query: ListOpportunitiesQueryDto): Promise<PaginatedOpportunitiesResponseDto> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;
    // Default: only show VERIFIED opportunities to general audience
    const verificationStatus = query.verificationStatus ?? VerificationStatus.VERIFIED;

    const result = await this.repo.findAll({
      page, limit, verificationStatus,
      q:              query.q,
      category:       query.category,
      benefitType:    query.benefitType,
      location:       query.location,
      country:        query.country,
      state:          query.state,
      tags:           query.tags,
      status:         query.status,
      deadlineFilter: query.deadlineFilter,
      sortBy:         query.sortBy,
      sortOrder:      query.sortOrder,
    });

    return {
      data:       result.data.map(OpportunityResponseDto.fromEntity),
      total:      result.total,
      page:       result.page,
      limit:      result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<OpportunityResponseDto> {
    const opp = await this.repo.findById(id);
    if (!opp) throw new NotFoundException(`Opportunity '${id}' not found`);
    return OpportunityResponseDto.fromEntity(opp);
  }

  async findByRef(opportunityRef: string): Promise<OpportunityResponseDto> {
    const opp = await this.repo.findByRef(opportunityRef);
    if (!opp) throw new NotFoundException(`Opportunity '${opportunityRef}' not found`);
    return OpportunityResponseDto.fromEntity(opp);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateOpportunityDto): Promise<OpportunityResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Opportunity '${id}' not found`);

    const deadline = dto.deadline ? new Date(dto.deadline) : existing.deadline ?? undefined;
    const merged   = { ...existing, ...dto, deadline };

    const confidenceScore = this.scoring.computeConfidence(merged);
    const freshnessScore  = this.scoring.computeFreshness({
      ...merged,
      updatedAt: new Date(),
    });

    const updated = await this.repo.update(id, {
      ...dto,
      deadline,
      confidenceScore,
      freshnessScore,
      lastUpdatedById: dto.lastUpdatedById ?? existing.lastUpdatedById,
    });

    this.logger.log(`Opportunity updated: ${updated.opportunityRef ?? id}`);
    return OpportunityResponseDto.fromEntity(updated);
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  async remove(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Opportunity '${id}' not found`);
    await this.repo.softDelete(id);
    this.logger.log(`Opportunity soft-deleted: ${existing.opportunityRef ?? id}`);
  }

  // ── Verification Workflow ─────────────────────────────────────────────────

  /**
   * Move DRAFT → PENDING_REVIEW.
   * Validates that confidence is sufficient before submission.
   */
  async submitForReview(id: string, submittedById: string): Promise<OpportunityResponseDto> {
    const opp = await this.repo.findById(id);
    if (!opp) throw new NotFoundException(`Opportunity '${id}' not found`);

    if (opp.verificationStatus !== VerificationStatus.DRAFT) {
      throw new ConflictException(
        `Opportunity is in '${opp.verificationStatus}' status. Only DRAFT opportunities can be submitted for review.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.PENDING_REVIEW,
      status:             OpportunityStatus.DRAFT,
      lastUpdatedById:    submittedById,
    });

    this.logger.log(`Opportunity submitted for review: ${opp.opportunityRef ?? id} by ${submittedById}`);
    return OpportunityResponseDto.fromEntity(updated);
  }

  /**
   * Move PENDING_REVIEW → VERIFIED (Admin only).
   * Recomputes confidence (adds verification bonus) and freshness scores.
   */
  async verify(id: string, dto: VerifyOpportunityDto): Promise<OpportunityResponseDto> {
    const opp = await this.repo.findById(id);
    if (!opp) throw new NotFoundException(`Opportunity '${id}' not found`);

    if (opp.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Opportunity is in '${opp.verificationStatus}' status. Only PENDING_REVIEW opportunities can be verified.`,
      );
    }

    const now = new Date();
    const withVerification = { ...opp, verificationStatus: VerificationStatus.VERIFIED, dateLastVerified: now, updatedAt: now };
    const confidenceScore  = this.scoring.computeConfidence(withVerification);
    const freshnessScore   = this.scoring.computeFreshness(withVerification);

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.VERIFIED,
      status:             OpportunityStatus.ACTIVE,
      dateLastVerified:   now,
      datePublished:      opp.datePublished ?? now,
      confidenceScore,
      freshnessScore,
      rejectionReason:    null,
      lastUpdatedById:    dto.reviewedById,
    });

    this.logger.log(`Opportunity verified: ${opp.opportunityRef ?? id} by ${dto.reviewedById}`);
    return OpportunityResponseDto.fromEntity(updated);
  }

  /**
   * Move PENDING_REVIEW → REJECTED (Admin only).
   */
  async reject(id: string, dto: RejectOpportunityDto): Promise<OpportunityResponseDto> {
    const opp = await this.repo.findById(id);
    if (!opp) throw new NotFoundException(`Opportunity '${id}' not found`);

    if (opp.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Opportunity is in '${opp.verificationStatus}' status. Only PENDING_REVIEW opportunities can be rejected.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.REJECTED,
      status:             OpportunityStatus.DRAFT,
      rejectionReason:    dto.rejectionReason,
      lastUpdatedById:    dto.reviewedById,
    });

    this.logger.log(`Opportunity rejected: ${opp.opportunityRef ?? id} by ${dto.reviewedById}`);
    return OpportunityResponseDto.fromEntity(updated);
  }

  /**
   * Archive any opportunity (regardless of current status).
   */
  async archive(id: string, archivedById: string): Promise<OpportunityResponseDto> {
    const opp = await this.repo.findById(id);
    if (!opp) throw new NotFoundException(`Opportunity '${id}' not found`);

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.ARCHIVED,
      status:             OpportunityStatus.ARCHIVED,
      lastUpdatedById:    archivedById,
    });

    this.logger.log(`Opportunity archived: ${opp.opportunityRef ?? id} by ${archivedById}`);
    return OpportunityResponseDto.fromEntity(updated);
  }
}
