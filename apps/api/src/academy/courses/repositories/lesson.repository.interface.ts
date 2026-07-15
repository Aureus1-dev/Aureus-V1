import { Lesson } from '@prisma/client';

export const LESSON_REPOSITORY = 'LESSON_REPOSITORY';

export interface CreateLessonInput {
  moduleId: string;
  title: string;
  content: string;
  position: number;
  estimatedDurationMinutes?: number;
  relatedArticleId?: string;
}

export interface UpdateLessonInput {
  title?: string;
  content?: string;
  position?: number;
  estimatedDurationMinutes?: number | null;
  relatedArticleId?: string | null;
}

export interface ILessonRepository {
  create(data: CreateLessonInput): Promise<Lesson>;
  findById(id: string): Promise<Lesson | null>;
  findByModule(moduleId: string): Promise<Lesson[]>;
  findByCourse(courseId: string): Promise<Lesson[]>;
  countByModule(moduleId: string): Promise<number>;
  update(id: string, data: UpdateLessonInput): Promise<Lesson>;
  remove(id: string): Promise<void>;
}
