import { CourseRevision } from '@prisma/client';

export const COURSE_REVISION_REPOSITORY = 'COURSE_REVISION_REPOSITORY';

export interface CreateCourseRevisionInput {
  courseId: string;
  versionNumber: number;
  title: string;
  shortDescription: string;
  fullDescription: string;
  editedById: string;
}

export interface ICourseRevisionRepository {
  create(data: CreateCourseRevisionInput): Promise<CourseRevision>;
  findByCourse(courseId: string): Promise<CourseRevision[]>;
}
