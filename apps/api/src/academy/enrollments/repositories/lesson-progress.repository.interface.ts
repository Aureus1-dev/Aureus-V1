import { LessonProgress, LessonProgressStatus } from '@prisma/client';

export const LESSON_PROGRESS_REPOSITORY = 'LESSON_PROGRESS_REPOSITORY';

export interface UpsertLessonProgressInput {
  enrollmentId: string;
  lessonId: string;
  status: LessonProgressStatus;
  startedAt?: Date;
  completedAt?: Date | null;
}

export interface ILessonProgressRepository {
  upsert(data: UpsertLessonProgressInput): Promise<LessonProgress>;
  findByEnrollment(enrollmentId: string): Promise<LessonProgress[]>;
  findByEnrollmentAndLesson(enrollmentId: string, lessonId: string): Promise<LessonProgress | null>;
  countCompletedByEnrollment(enrollmentId: string): Promise<number>;
}
