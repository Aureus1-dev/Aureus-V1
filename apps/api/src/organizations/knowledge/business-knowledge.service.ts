import { createHash } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessKnowledgeSourceKind,
  BusinessKnowledgeStatus,
  LibraryCandidateExportStatus,
  OrganizationMemberRole,
  OrganizationType,
  Prisma,
  TenantAuditAction,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { sanitizePlainText } from '../../common/utils/sanitize-text';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessKnowledgeDto } from './dto/create-business-knowledge.dto';
import { ImportBusinessKnowledgeDto } from './dto/import-business-knowledge.dto';
import { ListBusinessKnowledgeQueryDto } from './dto/list-business-knowledge-query.dto';
import { RejectBusinessKnowledgeDto } from './dto/reject-business-knowledge.dto';
import { UpdateBusinessKnowledgeDto } from './dto/update-business-knowledge.dto';

const EDIT_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
  OrganizationMemberRole.OPERATOR,
];

const REVIEW_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
];

const PRIVILEGED_ROLES: UserRole[] = [
  UserRole.STEWARD,
  UserRole.PLATFORM_ADMINISTRATOR,
  UserRole.SYSTEM_ADMINISTRATOR,
];

export const BUSINESS_KNOWLEDGE_NOTICE =
  'This is tenant-provided source material. Upload or approval does not make it legal advice, establish objective truth, or admit it to the Aureus Library.';

@Injectable()
export class BusinessKnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    query: ListBusinessKnowledgeQueryDto,
    caller: AuthenticatedUser,
  ) {
    await this.requireTenantMembership(organizationId, caller);
    const now = new Date();

    return this.prisma.db.businessKnowledgeRecord.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(query.status && { status: query.status }),
        ...(query.knowledgeType && { knowledgeType: query.knowledgeType }),
        ...(query.reviewDue && { nextReviewAt: { lte: now } }),
      },
      orderBy: [{ nextReviewAt: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async findOne(organizationId: string, id: string, caller: AuthenticatedUser) {
    await this.requireTenantMembership(organizationId, caller);
    return this.findScopedRecord(organizationId, id);
  }

  async createManual(
    organizationId: string,
    dto: CreateBusinessKnowledgeDto,
    caller: AuthenticatedUser,
  ) {
    const access = await this.requireTenantMembership(organizationId, caller);
    this.requireRole(access.membership?.role, caller, EDIT_ROLES, 'edit');

    return this.createRecord(
      organizationId,
      dto,
      BusinessKnowledgeSourceKind.MANUAL,
      caller,
    );
  }

  async importText(
    organizationId: string,
    dto: ImportBusinessKnowledgeDto,
    caller: AuthenticatedUser,
  ) {
    const access = await this.requireTenantMembership(organizationId, caller);
    this.requireRole(access.membership?.role, caller, EDIT_ROLES, 'import');

    return this.createRecord(
      organizationId,
      dto,
      BusinessKnowledgeSourceKind.IMPORT,
      caller,
      { fileName: sanitizePlainText(dto.fileName), mimeType: dto.mimeType },
    );
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateBusinessKnowledgeDto,
    caller: AuthenticatedUser,
  ) {
    const access = await this.requireTenantMembership(organizationId, caller);
    this.requireRole(access.membership?.role, caller, EDIT_ROLES, 'edit');
    const existing = await this.findScopedRecord(organizationId, id);

    if (![BusinessKnowledgeStatus.DRAFT, BusinessKnowledgeStatus.REJECTED].includes(existing.status)) {
      throw new ConflictException('Only DRAFT or REJECTED knowledge can be edited');
    }

    const freshnessIntervalDays = dto.freshnessIntervalDays ?? existing.freshnessIntervalDays;
    const nextReviewAt = this.reviewDate(freshnessIntervalDays);

    return this.prisma.db.$transaction(async (tx) => {
      const updated = await tx.businessKnowledgeRecord.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: sanitizePlainText(dto.title) }),
          ...(dto.summary !== undefined && { summary: sanitizePlainText(dto.summary) }),
          ...(dto.content !== undefined && { content: sanitizePlainText(dto.content) }),
          ...(dto.knowledgeType !== undefined && { knowledgeType: dto.knowledgeType }),
          ...(dto.sourceReference !== undefined && {
            sourceReference: sanitizePlainText(dto.sourceReference),
          }),
          ...(dto.sourceUrl !== undefined && { sourceUrl: dto.sourceUrl }),
          ...(dto.freshnessIntervalDays !== undefined && {
            freshnessIntervalDays: dto.freshnessIntervalDays,
          }),
          nextReviewAt,
          status: BusinessKnowledgeStatus.DRAFT,
          submittedAt: null,
          reviewedAt: null,
          rejectionReason: null,
          accountableReviewerId: caller.id,
          lastUpdatedById: caller.id,
        },
      });

      await this.audit(tx, organizationId, caller.id, TenantAuditAction.KNOWLEDGE_UPDATED, id);
      return updated;
    });
  }

  async submit(organizationId: string, id: string, caller: AuthenticatedUser) {
    const access = await this.requireTenantMembership(organizationId, caller);
    this.requireRole(access.membership?.role, caller, EDIT_ROLES, 'submit');
    const existing = await this.findScopedRecord(organizationId, id);

    if (![BusinessKnowledgeStatus.DRAFT, BusinessKnowledgeStatus.REJECTED].includes(existing.status)) {
      throw new ConflictException('Only DRAFT or REJECTED knowledge can be submitted');
    }

    return this.prisma.db.$transaction(async (tx) => {
      const updated = await tx.businessKnowledgeRecord.update({
        where: { id },
        data: {
          status: BusinessKnowledgeStatus.UNDER_REVIEW,
          submittedAt: new Date(),
          reviewedAt: null,
          rejectionReason: null,
          lastUpdatedById: caller.id,
        },
      });
      await this.audit(tx, organizationId, caller.id, TenantAuditAction.KNOWLEDGE_SUBMITTED, id);
      return updated;
    });
  }

  async approve(organizationId: string, id: string, caller: AuthenticatedUser) {
    const access = await this.requireTenantMembership(organizationId, caller);
    this.requireRole(access.membership?.role, caller, REVIEW_ROLES, 'approve');
    const existing = await this.findScopedRecord(organizationId, id);

    if (existing.status !== BusinessKnowledgeStatus.UNDER_REVIEW) {
      throw new ConflictException('Only UNDER_REVIEW knowledge can be approved');
    }

    const now = new Date();
    return this.prisma.db.$transaction(async (tx) => {
      const updated = await tx.businessKnowledgeRecord.update({
        where: { id },
        data: {
          status: BusinessKnowledgeStatus.APPROVED,
          accountableReviewerId: caller.id,
          reviewedAt: now,
          rejectionReason: null,
          nextReviewAt: this.reviewDate(existing.freshnessIntervalDays, now),
          lastUpdatedById: caller.id,
        },
      });
      await this.audit(tx, organizationId, caller.id, TenantAuditAction.KNOWLEDGE_APPROVED, id);
      return updated;
    });
  }

  async reject(
    organizationId: string,
    id: string,
    dto: RejectBusinessKnowledgeDto,
    caller: AuthenticatedUser,
  ) {
    const access = await this.requireTenantMembership(organizationId, caller);
    this.requireRole(access.membership?.role, caller, REVIEW_ROLES, 'reject');
    const existing = await this.findScopedRecord(organizationId, id);

    if (existing.status !== BusinessKnowledgeStatus.UNDER_REVIEW) {
      throw new ConflictException('Only UNDER_REVIEW knowledge can be rejected');
    }

    return this.prisma.db.$transaction(async (tx) => {
      const updated = await tx.businessKnowledgeRecord.update({
        where: { id },
        data: {
          status: BusinessKnowledgeStatus.REJECTED,
          accountableReviewerId: caller.id,
          reviewedAt: new Date(),
          rejectionReason: sanitizePlainText(dto.reason),
          lastUpdatedById: caller.id,
        },
      });
      await this.audit(tx, organizationId, caller.id, TenantAuditAction.KNOWLEDGE_REJECTED, id);
      return updated;
    });
  }

  async createLibraryCandidate(
    organizationId: string,
    id: string,
    caller: AuthenticatedUser,
  ) {
    const access = await this.requireTenantMembership(organizationId, caller);
    this.requireRole(access.membership?.role, caller, REVIEW_ROLES, 'export');
    const record = await this.findScopedRecord(organizationId, id);

    if (record.status !== BusinessKnowledgeStatus.APPROVED) {
      throw new ConflictException('Only APPROVED tenant knowledge can become a Library candidate');
    }

    const pending = await this.prisma.db.libraryCandidateExport.findFirst({
      where: {
        organizationId,
        knowledgeRecordId: id,
        status: LibraryCandidateExportStatus.PENDING,
      },
    });
    if (pending) {
      throw new ConflictException('A pending Library candidate already exists for this record');
    }

    const payload = {
      contract_version: '1.0.0',
      candidate_only: true,
      tenant_id: organizationId,
      source_record_id: record.id,
      knowledge_type: record.knowledgeType,
      title: record.title,
      summary: record.summary,
      content: record.content,
      provenance: {
        source_kind: record.sourceKind,
        source_reference: record.sourceReference,
        source_url: record.sourceUrl,
        tenant_reviewed_at: record.reviewedAt?.toISOString() ?? null,
        freshness_interval_days: record.freshnessIntervalDays,
        next_review_at: record.nextReviewAt.toISOString(),
      },
      notice: BUSINESS_KNOWLEDGE_NOTICE,
    };
    const serialized = JSON.stringify(payload);
    const payloadSha256 = createHash('sha256').update(serialized).digest('hex');

    return this.prisma.db.$transaction(async (tx) => {
      const candidate = await tx.libraryCandidateExport.create({
        data: {
          organizationId,
          knowledgeRecordId: id,
          payload: payload as Prisma.InputJsonValue,
          payloadSha256,
          createdById: caller.id,
        },
      });
      await this.audit(
        tx,
        organizationId,
        caller.id,
        TenantAuditAction.LIBRARY_CANDIDATE_CREATED,
        candidate.id,
      );
      return candidate;
    });
  }

  private async createRecord(
    organizationId: string,
    dto: CreateBusinessKnowledgeDto,
    sourceKind: BusinessKnowledgeSourceKind,
    caller: AuthenticatedUser,
    imported?: { fileName: string; mimeType: string },
  ) {
    return this.prisma.db.$transaction(async (tx) => {
      const record = await tx.businessKnowledgeRecord.create({
        data: {
          organizationId,
          title: sanitizePlainText(dto.title),
          summary: sanitizePlainText(dto.summary),
          content: sanitizePlainText(dto.content),
          knowledgeType: dto.knowledgeType,
          sourceKind,
          sourceReference: sanitizePlainText(dto.sourceReference),
          sourceUrl: dto.sourceUrl,
          sourceFileName: imported?.fileName,
          sourceMimeType: imported?.mimeType,
          freshnessIntervalDays: dto.freshnessIntervalDays,
          nextReviewAt: this.reviewDate(dto.freshnessIntervalDays),
          accountableReviewerId: caller.id,
          createdById: caller.id,
          lastUpdatedById: caller.id,
        },
      });
      await this.audit(tx, organizationId, caller.id, TenantAuditAction.KNOWLEDGE_CREATED, record.id);
      return record;
    });
  }

  private async requireTenantMembership(organizationId: string, caller: AuthenticatedUser) {
    const organization = await this.prisma.db.organization.findFirst({
      where: { id: organizationId, organizationType: OrganizationType.BUSINESS, deletedAt: null },
      include: { members: { where: { userId: caller.id }, take: 1 } },
    });
    if (!organization) {
      throw new NotFoundException(`Organization '${organizationId}' not found`);
    }

    const membership = organization.members[0] ?? null;
    if (!membership && !hasRole(caller, PRIVILEGED_ROLES)) {
      throw new NotFoundException(`Organization '${organizationId}' not found`);
    }
    return { organization, membership };
  }

  private requireRole(
    role: OrganizationMemberRole | undefined,
    caller: AuthenticatedUser,
    allowed: OrganizationMemberRole[],
    action: string,
  ) {
    if (hasRole(caller, PRIVILEGED_ROLES)) return;
    if (!role || !allowed.includes(role)) {
      throw new ForbiddenException(`You do not have permission to ${action} this tenant's knowledge`);
    }
  }

  private async findScopedRecord(organizationId: string, id: string) {
    const record = await this.prisma.db.businessKnowledgeRecord.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!record) throw new NotFoundException(`Knowledge record '${id}' not found`);
    return record;
  }

  private reviewDate(days: number, from = new Date()) {
    return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private audit(
    tx: Prisma.TransactionClient,
    organizationId: string,
    actorId: string,
    action: TenantAuditAction,
    resourceId: string,
  ) {
    return tx.tenantAuditEvent.create({
      data: {
        organizationId,
        actorId,
        action,
        resourceType: 'BusinessKnowledge',
        resourceId,
        context: { tenantScoped: true },
      },
    });
  }
}
