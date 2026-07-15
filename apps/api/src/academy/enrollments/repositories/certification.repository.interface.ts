import { Certification } from '@prisma/client';

export const CERTIFICATION_REPOSITORY = 'CERTIFICATION_REPOSITORY';

export interface CreateCertificationInput {
  userId: string;
  courseId: string;
}

export interface ICertificationRepository {
  create(data: CreateCertificationInput): Promise<Certification>;
  setRef(id: string, certificateRef: string): Promise<Certification>;
  findById(id: string): Promise<Certification | null>;
  findByUserAndCourse(userId: string, courseId: string): Promise<Certification | null>;
  findByUser(userId: string): Promise<Certification[]>;
}
