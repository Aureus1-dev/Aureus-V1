import { Injectable } from '@nestjs/common';
import { Course, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CourseQueryParams,
  CreateCourseInput,
  ICourseRepository,
  PaginatedCourses,
  UpdateCourseInput,
} from './course.repository.interface';

@Injectable()
export class PrismaCourseRepository implements ICourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCourseInput): Promise<Course> {
    return this.prisma.db.course.create({ data });
  }

  async setRef(id: string, courseRef: string): Promise<Course> {
    return this.prisma.db.course.update({ where: { id }, data: { courseRef } });
  }

  async findById(id: string): Promise<Course | null> {
    return this.prisma.db.course.findFirst({ where: { id, deletedAt: null } });
  }

  async findByRef(courseRef: string): Promise<Course | null> {
    return this.prisma.db.course.findFirst({ where: { courseRef, deletedAt: null } });
  }

  async findAll(params: CourseQueryParams): Promise<PaginatedCourses> {
    const {
      page, limit, q, learningDomain, status, verificationStatus, authorId, organizationId,
      sortBy = 'newest', sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const searchClauses: Prisma.CourseWhereInput[] = q
      ? [
          { title:            { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
          { fullDescription:  { contains: q, mode: 'insensitive' } },
        ]
      : [];

    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      ...(searchClauses.length && { OR: searchClauses }),
      ...(learningDomain      && { learningDomain }),
      ...(status               && { status }),
      ...(verificationStatus   && { verificationStatus }),
      ...(authorId              && { authorId }),
      ...(organizationId        && { organizationId }),
    };

    const dir = sortOrder;
    const orderBy: Prisma.CourseOrderByWithRelationInput =
      sortBy === 'alphabetical' ? { title: dir } : { createdAt: dir }; // 'newest'

    const [data, total] = await Promise.all([
      this.prisma.db.course.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.db.course.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateCourseInput): Promise<Course> {
    return this.prisma.db.course.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Course> {
    return this.prisma.db.course.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
