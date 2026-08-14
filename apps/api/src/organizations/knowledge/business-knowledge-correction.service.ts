import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BusinessKnowledgeSourceKind,
  BusinessKnowledgeStatus,
  OrganizationMemberRole,
  TenantAuditAction,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { sanitizePlainText } from '../../common/utils/sanitize-text';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessKnowledgeCorrectionDto } from './dto/create-business-knowledge-correction.dto';

const REVIEW_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
];

export const CORRECTION_REFERENCE_PREFIX = 'PF008_CORRECTION_OF:';

@Injectable()
export class BusinessKnowledgeCorrectionService {
  constructor(private readonly prisma: PrismaService) {}

  async createCorrection(
    organizationId: string,
    approvedRecordId: string,
    dto: CreateBusinessKnowledgeCorrectionDto,
    caller: AuthenticatedUser,
  ) {
    await this.requireReviewer(organizationId, caller.id);

    const original = await this.prisma.db.businessKnowledgeRecord.findFirst({
      where: {
        id: approvedRecordId,
        organizationId,
        deletedAt: null,
        status: BusinessKnowledgeStatus.APPROVED,
      },
    });
    if (!original) {
      throw new NotFoundException(`Approved knowledge record '${approvedRecordId}' not found`);
    }

    const pending = await this.prisma.db.businessKnowledgeRecord.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        sourceReference: { startsWith: `${CORRECTION_REFERENCE_PREFIX}${approvedRecordId}|` },
        status: { in: [BusinessKnowledgeStatus.DRAFT, BusinessKnowledgeStatus.UNDER_REVIEW] },
      },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException('This approved source already has a correction under review');
    }

    const reason = sanitizePlainText(dto.correctionReason).slice(0, 500);
    const sourceReference = `${CORRECTION_REFERENCE_PREFIX}${approvedRecordId}|${reason}|${sanitizePlainText(dto.sourceReference)}`;
    const nextReviewAt = new Date(Date.now() + dto.freshnessIntervalDays * 24 * 60 * 60 * 1000);

    return this.prisma.db.$transaction(async (tx) => {
      const correction = await tx.businessKnowledgeRecord.create({
        data: {
          organizationId,
          title: sanitizePlainText(dto.title),
          summary: sanitizePlainText(dto.summary),
          content: sanitizePlainText(dto.content),
          knowledgeType: dto.knowledgeType,
          status: BusinessKnowledgeStatus.DRAFT,
          sourceKind: BusinessKnowledgeSourceKind.MANUAL,
          sourceReference,
          sourceUrl: dto.sourceUrl,
          freshnessIntervalDays: dto.freshnessIntervalDays,
          nextReviewAt,
          accountableReviewerId: caller.id,
          createdById: caller.id,
          lastUpdatedById: caller.id,
        },
      });

      await tx.tenantAuditEvent.create({
        data: {
          organizationId,
          actorId: caller.id,
          action: TenantAuditAction.KNOWLEDGE_CREATED,
          resourceType: 'BusinessKnowledgeCorrection',
          resourceId: correction.id,
          context: {
            tenantScoped: true,
            replacesApprovedRecordId: approvedRecordId,
            approvedRecordRemainsLive: true,
          },
        },
      });

      return {
        ...correction,
        correctionOf: approvedRecordId,
        correctionReason: reason,
        originalRemainsLive: true,
      };
    });
  }

  private async requireReviewer(organizationId: string, userId: string) {
    const membership = await this.prisma.db.organizationMember.findFirst({
      where: { organizationId, userId, role: { in: REVIEW_ROLES } },
      select: { role: true },
    });
    if (!membership) {
      throw new ForbiddenException('Only a tenant owner, admin, or manager can propose a reviewed correction');
    }
  }
}
