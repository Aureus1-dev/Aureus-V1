import { Injectable } from '@nestjs/common';
import { LearningPathCourse } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AddCourseToPathInput,
  ILearningPathCourseRepository,
} from './learning-path-course.repository.interface';

@Injectable()
export class PrismaLearningPathCourseRepository implements ILearningPathCourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(data: AddCourseToPathInput): Promise<LearningPathCourse> {
    return this.prisma.db.learningPathCourse.create({ data });
  }

  async findByPath(learningPathId: string): Promise<LearningPathCourse[]> {
    return this.prisma.db.learningPathCourse.findMany({
      where: { learningPathId },
      orderBy: { position: 'asc' },
    });
  }

  async findOne(learningPathId: string, courseId: string): Promise<LearningPathCourse | null> {
    return this.prisma.db.learningPathCourse.findUnique({
      where: { learningPathId_courseId: { learningPathId, courseId } },
    });
  }

  async updatePosition(id: string, position: number): Promise<LearningPathCourse> {
    return this.prisma.db.learningPathCourse.update({ where: { id }, data: { position } });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.db.learningPathCourse.delete({ where: { id } });
  }
}
