import { Enrollment, EnrollmentStatus } from '@prisma/client';

export const ENROLLMENT_REPOSITORY = 'ENROLLMENT_REPOSITORY';

export interface CreateEnrollmentInput {
  userId: string;
  courseId: string;
}

export interface UpdateEnrollmentInput {
  status?: EnrollmentStatus;
  completedAt?: Date;
}

export interface IEnrollmentRepository {
  create(data: CreateEnrollmentInput): Promise<Enrollment>;
  findById(id: string): Promise<Enrollment | null>;
  findByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null>;
  findByUser(userId: string): Promise<Enrollment[]>;
  update(id: string, data: UpdateEnrollmentInput): Promise<Enrollment>;
}
