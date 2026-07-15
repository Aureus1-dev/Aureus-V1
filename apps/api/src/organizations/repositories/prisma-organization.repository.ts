import { Injectable } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateOrganizationInput,
  IOrganizationRepository,
  OrganizationQueryParams,
  PaginatedOrganizations,
  UpdateOrganizationInput,
} from './organization.repository.interface';

@Injectable()
export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrganizationInput): Promise<Organization> {
    return this.prisma.db.organization.create({ data });
  }

  async setRef(id: string, organizationRef: string): Promise<Organization> {
    return this.prisma.db.organization.update({ where: { id }, data: { organizationRef } });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.db.organization.findFirst({ where: { id, deletedAt: null } });
  }

  async findByRef(organizationRef: string): Promise<Organization | null> {
    return this.prisma.db.organization.findFirst({ where: { organizationRef, deletedAt: null } });
  }

  async findAll(params: OrganizationQueryParams): Promise<PaginatedOrganizations> {
    const {
      page, limit, q, organizationType, country, state, city,
      status, verificationStatus, sortBy = 'newest', sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const searchClauses: Prisma.OrganizationWhereInput[] = q
      ? [
          { name:             { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
        ]
      : [];

    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      ...(searchClauses.length && { OR: searchClauses }),
      ...(organizationType    && { organizationType }),
      ...(country              && { country: { contains: country, mode: 'insensitive' } }),
      ...(state                && { state:   { contains: state,   mode: 'insensitive' } }),
      ...(city                 && { city:    { contains: city,    mode: 'insensitive' } }),
      ...(status               && { status }),
      ...(verificationStatus   && { verificationStatus }),
    };

    const dir = sortOrder;
    const orderBy: Prisma.OrganizationOrderByWithRelationInput =
      sortBy === 'alphabetical' ? { name: dir } : { createdAt: dir }; // 'newest'

    const [data, total] = await Promise.all([
      this.prisma.db.organization.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.db.organization.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateOrganizationInput): Promise<Organization> {
    return this.prisma.db.organization.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Organization> {
    return this.prisma.db.organization.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
