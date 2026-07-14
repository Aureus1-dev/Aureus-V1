import { Injectable } from '@nestjs/common';
import { Prisma, Resource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateResourceInput,
  IResourceRepository,
  PaginatedResources,
  ResourceQueryParams,
  UpdateResourceInput,
} from './resource.repository.interface';

@Injectable()
export class PrismaResourceRepository implements IResourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateResourceInput): Promise<Resource> {
    return this.prisma.db.resource.create({ data });
  }

  async setRef(id: string, resourceRef: string): Promise<Resource> {
    return this.prisma.db.resource.update({ where: { id }, data: { resourceRef } });
  }

  async findById(id: string): Promise<Resource | null> {
    return this.prisma.db.resource.findFirst({ where: { id, deletedAt: null } });
  }

  async findByRef(resourceRef: string): Promise<Resource | null> {
    return this.prisma.db.resource.findFirst({ where: { resourceRef, deletedAt: null } });
  }

  async findAll(params: ResourceQueryParams): Promise<PaginatedResources> {
    const {
      page, limit, q, category, resourceType, location, country, state, city,
      isRemote, tags, status, verificationStatus, ownerId,
      sortBy = 'newest', sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    // ── Text search ───────────────────────────────────────────────────────
    const searchClauses: Prisma.ResourceWhereInput[] = q
      ? [
          { title:            { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
          { organizationName: { contains: q, mode: 'insensitive' } },
          { eligibilityNotes: { contains: q, mode: 'insensitive' } },
        ]
      : [];

    const where: Prisma.ResourceWhereInput = {
      deletedAt: null,
      ...(searchClauses.length && { OR: searchClauses }),
      ...(category           && { category }),
      ...(resourceType       && { resourceType }),
      ...(location            && { location: { contains: location, mode: 'insensitive' } }),
      ...(country             && { country:  { contains: country,  mode: 'insensitive' } }),
      ...(state               && { state:    { contains: state,    mode: 'insensitive' } }),
      ...(city                && { city:     { contains: city,     mode: 'insensitive' } }),
      ...(isRemote !== undefined && { isRemote }),
      ...(tags?.length        && { tags: { hasSome: tags } }),
      ...(status              && { status }),
      ...(verificationStatus  && { verificationStatus }),
      ...(ownerId              && { ownerId }),
    };

    // ── Sort ──────────────────────────────────────────────────────────────
    const dir = sortOrder;
    const orderBy: Prisma.ResourceOrderByWithRelationInput =
      sortBy === 'confidence'   ? { confidenceScore: dir } :
      sortBy === 'freshness'    ? { freshnessScore:  dir } :
      sortBy === 'alphabetical' ? { title:           dir } :
                                   { createdAt:       dir };   // 'newest'

    const [data, total] = await Promise.all([
      this.prisma.db.resource.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.db.resource.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateResourceInput): Promise<Resource> {
    return this.prisma.db.resource.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Resource> {
    return this.prisma.db.resource.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
