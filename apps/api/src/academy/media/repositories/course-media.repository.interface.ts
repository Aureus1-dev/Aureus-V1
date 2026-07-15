import { CourseMedia } from '@prisma/client';

export const COURSE_MEDIA_REPOSITORY = 'COURSE_MEDIA_REPOSITORY';

export interface AddCourseMediaInput {
  courseId: string;
  lessonId?: string;
  mediaAssetId: string;
  position?: number;
}

export interface ICourseMediaRepository {
  add(data: AddCourseMediaInput): Promise<CourseMedia>;
  findById(id: string): Promise<CourseMedia | null>;
  findByCourse(courseId: string): Promise<CourseMedia[]>;
  findByLesson(lessonId: string): Promise<CourseMedia[]>;
  remove(id: string): Promise<void>;
}
