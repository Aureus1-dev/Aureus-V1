import { Injectable } from '@nestjs/common';
import { CourseMedia } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddCourseMediaInput, ICourseMediaRepository } from './course-media.repository.interface';

@Injectable()
export class PrismaCourseMediaRepository implements ICourseMediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(data: AddCourseMediaInput): Promise<CourseMedia> {
    return this.prisma.db.courseMedia.create({ data });
  }

  async findById(id: string): Promise<CourseMedia | null> {
    return this.prisma.db.courseMedia.findUnique({ where: { id } });
  }

  async findByCourse(courseId: string): Promise<CourseMedia[]> {
    return this.prisma.db.courseMedia.findMany({ where: { courseId }, orderBy: { position: 'asc' } });
  }

  async findByLesson(lessonId: string): Promise<CourseMedia[]> {
    return this.prisma.db.courseMedia.findMany({ where: { lessonId }, orderBy: { position: 'asc' } });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.db.courseMedia.delete({ where: { id } });
  }
}
