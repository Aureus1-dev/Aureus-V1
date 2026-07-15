import { AcademyContentStatus, LearningPath, VerificationStatus } from '@prisma/client';

export const LEARNING_PATH_REPOSITORY = 'LEARNING_PATH_REPOSITORY';

export interface CreateLearningPathInput {
  title: string;
  shortDescription: string;
  fullDescription: string;
  authorId: string;
  lastUpdatedById: string;
}

export interface UpdateLearningPathInput {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  status?: AcademyContentStatus;
  verificationStatus?: VerificationStatus;
  rejectionReason?: string | null;
  datePublished?: Date;
  lastUpdatedById?: string;
}

export type SortField = 'newest' | 'alphabetical';

export interface LearningPathQueryParams {
  page: number;
  limit: number;
  q?: string;
  status?: AcademyContentStatus;
  verificationStatus?: VerificationStatus;
  authorId?: string;
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedLearningPaths {
  data: LearningPath[];
  total: number;
  page: number;
  limit: number;
}

export interface ILearningPathRepository {
  create(data: CreateLearningPathInput): Promise<LearningPath>;
  setRef(id: string, pathRef: string): Promise<LearningPath>;
  findById(id: string): Promise<LearningPath | null>;
  findByRef(pathRef: string): Promise<LearningPath | null>;
  findAll(params: LearningPathQueryParams): Promise<PaginatedLearningPaths>;
  update(id: string, data: UpdateLearningPathInput): Promise<LearningPath>;
  softDelete(id: string): Promise<LearningPath>;
}
