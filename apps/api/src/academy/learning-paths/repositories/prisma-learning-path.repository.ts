import { Injectable } from '@nestjs/common';
import { LearningPath, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateLearningPathInput,
  ILearningPathRepository,
  LearningPathQueryParams,
  PaginatedLearningPaths,
  UpdateLearningPathInput,
} from './learning-path.repository.interface';

@Injectable()
export class PrismaLearningPathRepository implements ILearningPathRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLearningPathInput): Promise<LearningPath> {
    return this.prisma.db.learningPath.create({ data });
  }

  async setRef(id: string, pathRef: string): Promise<LearningPath> {
    return this.prisma.db.learningPath.update({ where: { id }, data: { pathRef } });
  }

  async findById(id: string): Promise<LearningPath | null> {
    return this.prisma.db.learningPath.findFirst({ where: { id, deletedAt: null } });
  }

  async findByRef(pathRef: string): Promise<LearningPath | null> {
    return this.prisma.db.learningPath.findFirst({ where: { pathRef, deletedAt: null } });
  }

  async findAll(params: LearningPathQueryParams): Promise<PaginatedLearningPaths> {
    const { page, limit, q, status, verificationStatus, authorId, sortBy = 'newest', sortOrder = 'desc' } = params;

    const skip = (page - 1) * limit;

    const searchClauses: Prisma.LearningPathWhereInput[] = q
      ? [
          { title:            { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
          { fullDescription:  { contains: q, mode: 'insensitive' } },
        ]
      : [];

    const where: Prisma.LearningPathWhereInput = {
      deletedAt: null,
      ...(searchClauses.length && { OR: searchClauses }),
      ...(status             && { status }),
      ...(verificationStatus && { verificationStatus }),
      ...(authorId            && { authorId }),
    };

    const dir = sortOrder;
    const orderBy: Prisma.LearningPathOrderByWithRelationInput =
      sortBy === 'alphabetical' ? { title: dir } : { createdAt: dir }; // 'newest'

    const [data, total] = await Promise.all([
      this.prisma.db.learningPath.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.db.learningPath.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateLearningPathInput): Promise<LearningPath> {
    return this.prisma.db.learningPath.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<LearningPath> {
    return this.prisma.db.learningPath.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
