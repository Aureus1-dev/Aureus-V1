import { Injectable } from '@nestjs/common';
import { CourseRevision } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCourseRevisionInput, ICourseRevisionRepository } from './course-revision.repository.interface';

@Injectable()
export class PrismaCourseRevisionRepository implements ICourseRevisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCourseRevisionInput): Promise<CourseRevision> {
    return this.prisma.db.courseRevision.create({ data });
  }

  async findByCourse(courseId: string): Promise<CourseRevision[]> {
    return this.prisma.db.courseRevision.findMany({
      where: { courseId },
      orderBy: { versionNumber: 'desc' },
    });
  }
}
