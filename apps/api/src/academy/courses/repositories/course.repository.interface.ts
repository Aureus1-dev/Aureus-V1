import { AcademyContentStatus, Course, LearningDomain, VerificationStatus } from '@prisma/client';

export const COURSE_REPOSITORY = 'COURSE_REPOSITORY';

export interface CreateCourseInput {
  title: string;
  shortDescription: string;
  fullDescription: string;
  learningDomain: LearningDomain;
  estimatedDurationMinutes?: number;
  grantsCertification?: boolean;
  organizationId?: string;
  authorId: string;
  lastUpdatedById: string;
}

export interface UpdateCourseInput {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  learningDomain?: LearningDomain;
  estimatedDurationMinutes?: number | null;
  grantsCertification?: boolean;
  organizationId?: string | null;
  status?: AcademyContentStatus;
  verificationStatus?: VerificationStatus;
  rejectionReason?: string | null;
  version?: number;
  datePublished?: Date;
  lastUpdatedById?: string;
}

export type SortField = 'newest' | 'alphabetical';

export interface CourseQueryParams {
  page: number;
  limit: number;
  q?: string;
  learningDomain?: LearningDomain;
  status?: AcademyContentStatus;
  verificationStatus?: VerificationStatus;
  authorId?: string;
  organizationId?: string;
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedCourses {
  data: Course[];
  total: number;
  page: number;
  limit: number;
}

export interface ICourseRepository {
  create(data: CreateCourseInput): Promise<Course>;
  setRef(id: string, courseRef: string): Promise<Course>;
  findById(id: string): Promise<Course | null>;
  findByRef(courseRef: string): Promise<Course | null>;
  findAll(params: CourseQueryParams): Promise<PaginatedCourses>;
  update(id: string, data: UpdateCourseInput): Promise<Course>;
  softDelete(id: string): Promise<Course>;
}
