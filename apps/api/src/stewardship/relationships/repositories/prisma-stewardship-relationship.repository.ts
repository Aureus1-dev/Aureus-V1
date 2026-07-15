import { Injectable } from '@nestjs/common';
import { Prisma, StewardshipRelationship, StewardshipRelationshipStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateRelationshipInput,
  IStewardshipRelationshipRepository,
  PaginatedRelationships,
  RelationshipQueryParams,
  UpdateRelationshipInput,
} from './stewardship-relationship.repository.interface';

@Injectable()
export class PrismaStewardshipRelationshipRepository implements IStewardshipRelationshipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRelationshipInput): Promise<StewardshipRelationship> {
    return this.prisma.db.stewardshipRelationship.create({ data });
  }

  async findById(id: string): Promise<StewardshipRelationship | null> {
    return this.prisma.db.stewardshipRelationship.findUnique({ where: { id } });
  }

  async findAll(params: RelationshipQueryParams): Promise<PaginatedRelationships> {
    const { page, limit, memberId, stewardId, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.StewardshipRelationshipWhereInput = {
      ...(memberId && { memberId }),
      ...(stewardId && { stewardId }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.stewardshipRelationship.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.db.stewardshipRelationship.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async countActiveByStewardId(stewardId: string): Promise<number> {
    return this.prisma.db.stewardshipRelationship.count({
      where: { stewardId, status: StewardshipRelationshipStatus.ACTIVE },
    });
  }

  async update(id: string, data: UpdateRelationshipInput): Promise<StewardshipRelationship> {
    return this.prisma.db.stewardshipRelationship.update({ where: { id }, data });
  }
}
