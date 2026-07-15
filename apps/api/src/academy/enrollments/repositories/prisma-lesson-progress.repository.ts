import { Injectable } from '@nestjs/common';
import { LessonProgress, LessonProgressStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ILessonProgressRepository,
  UpsertLessonProgressInput,
} from './lesson-progress.repository.interface';

@Injectable()
export class PrismaLessonProgressRepository implements ILessonProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: UpsertLessonProgressInput): Promise<LessonProgress> {
    const { enrollmentId, lessonId, ...rest } = data;
    return this.prisma.db.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: { enrollmentId, lessonId, ...rest },
      update: rest,
    });
  }

  async findByEnrollment(enrollmentId: string): Promise<LessonProgress[]> {
    return this.prisma.db.lessonProgress.findMany({ where: { enrollmentId } });
  }

  async findByEnrollmentAndLesson(enrollmentId: string, lessonId: string): Promise<LessonProgress | null> {
    return this.prisma.db.lessonProgress.findUnique({ where: { enrollmentId_lessonId: { enrollmentId, lessonId } } });
  }

  async countCompletedByEnrollment(enrollmentId: string): Promise<number> {
    return this.prisma.db.lessonProgress.count({
      where: { enrollmentId, status: LessonProgressStatus.COMPLETED },
    });
  }
}
