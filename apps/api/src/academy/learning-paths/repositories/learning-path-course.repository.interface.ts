import { LearningPathCourse } from '@prisma/client';

export const LEARNING_PATH_COURSE_REPOSITORY = 'LEARNING_PATH_COURSE_REPOSITORY';

export interface AddCourseToPathInput {
  learningPathId: string;
  courseId: string;
  position: number;
}

export interface ILearningPathCourseRepository {
  add(data: AddCourseToPathInput): Promise<LearningPathCourse>;
  findByPath(learningPathId: string): Promise<LearningPathCourse[]>;
  findOne(learningPathId: string, courseId: string): Promise<LearningPathCourse | null>;
  updatePosition(id: string, position: number): Promise<LearningPathCourse>;
  remove(id: string): Promise<void>;
}
