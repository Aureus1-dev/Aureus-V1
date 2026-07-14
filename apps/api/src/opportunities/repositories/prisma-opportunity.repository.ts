import { Injectable } from '@nestjs/common';
import { Opportunity, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateOpportunityInput,
  IOpportunityRepository,
  OpportunityQueryParams,
  PaginatedOpportunities,
  UpdateOpportunityInput,
} from './opportunity.repository.interface';

@Injectable()
export class PrismaOpportunityRepository implements IOpportunityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOpportunityInput): Promise<Opportunity> {
    return this.prisma.db.opportunity.create({ data });
  }

  async setRef(id: string, opportunityRef: string): Promise<Opportunity> {
    return this.prisma.db.opportunity.update({ where: { id }, data: { opportunityRef } });
  }

  async findById(id: string): Promise<Opportunity | null> {
    return this.prisma.db.opportunity.findFirst({ where: { id, deletedAt: null } });
  }

  async findByRef(opportunityRef: string): Promise<Opportunity | null> {
    return this.prisma.db.opportunity.findFirst({ where: { opportunityRef, deletedAt: null } });
  }

  async findAll(params: OpportunityQueryParams): Promise<PaginatedOpportunities> {
    const { page, limit, q, category, benefitType, location, country, state,
      tags, status, verificationStatus, deadlineFilter, sortBy = 'newest', sortOrder = 'desc' } = params;

    const skip = (page - 1) * limit;
    const now = new Date();

    // ── Text search ───────────────────────────────────────────────────────
    const searchClauses: Prisma.OpportunityWhereInput[] = q
      ? [
          { title:            { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
          { provider:         { contains: q, mode: 'insensitive' } },
          { eligibilityRules: { contains: q, mode: 'insensitive' } },
        ]
      : [];

    // ── Deadline filter ───────────────────────────────────────────────────
    let deadlineWhere: Prisma.DateTimeNullableFilter | undefined;
    if (deadlineFilter === 'afterNow') {
      deadlineWhere = { gte: now };
    } else if (deadlineFilter === 'within7days') {
      deadlineWhere = { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) };
    } else if (deadlineFilter === 'within30days') {
      deadlineWhere = { gte: now, lte: new Date(now.getTime() + 30 * 86_400_000) };
    }

    const where: Prisma.OpportunityWhereInput = {
      deletedAt: null,
      ...(searchClauses.length && { OR: searchClauses }),
      ...(category           && { category }),
      ...(benefitType        && { benefitType }),
      ...(location           && { location: { contains: location, mode: 'insensitive' } }),
      ...(country            && { country: { contains: country, mode: 'insensitive' } }),
      ...(state              && { state:   { contains: state,   mode: 'insensitive' } }),
      ...(tags?.length       && { tags: { hasSome: tags } }),
      ...(status             && { status }),
      ...(verificationStatus && { verificationStatus }),
      ...(deadlineWhere      && { deadline: deadlineWhere }),
    };

    // ── Sort ──────────────────────────────────────────────────────────────
    const dir = sortOrder;
    const orderBy: Prisma.OpportunityOrderByWithRelationInput =
      sortBy === 'deadline'    ? { deadline:       dir } :
      sortBy === 'confidence'  ? { confidenceScore: dir } :
      sortBy === 'freshness'   ? { freshnessScore:  dir } :
                                 { createdAt:       dir };   // 'newest'

    const [data, total] = await Promise.all([
      this.prisma.db.opportunity.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.db.opportunity.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateOpportunityInput): Promise<Opportunity> {
    return this.prisma.db.opportunity.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Opportunity> {
    return this.prisma.db.opportunity.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
