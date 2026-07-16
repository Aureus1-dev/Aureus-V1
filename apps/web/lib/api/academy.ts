import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/academy/**\/dto/*` exactly (FPB-009 §8).
 * Members only ever read course/module/lesson/learning-path content —
 * creation/verification is role-gated to Steward/Admin on the backend.
 */
export type LearningDomain =
  | 'PERSONAL_DEVELOPMENT'
  | 'FINANCIAL_LITERACY'
  | 'CAREER_READINESS'
  | 'ENTREPRENEURSHIP'
  | 'LEADERSHIP'
  | 'TECHNOLOGY_AND_AI'
  | 'HEALTH_AND_WELLBEING'
  | 'CIVIC_AND_COMMUNITY_ENGAGEMENT'
  | 'STEWARDSHIP'
  | 'MISSION_SPECIFIC_PROGRAMS';

export type AcademyContentStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type VerificationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'ARCHIVED';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface CourseDto {
  id: string;
  courseRef: string | null;
  title: string;
  shortDescription: string;
  fullDescription: string;
  learningDomain: LearningDomain;
  estimatedDurationMinutes: number | null;
  status: AcademyContentStatus;
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  version: number;
  grantsCertification: boolean;
  organizationId: string | null;
  authorId: string;
  lastUpdatedById: string;
  datePublished: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCoursesDto {
  data: CourseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListCoursesParams {
  page?: number;
  limit?: number;
  q?: string;
  learningDomain?: LearningDomain;
  sortBy?: 'newest' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
}

export function listCourses(accessToken: string, params: ListCoursesParams = {}): Promise<PaginatedCoursesDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.q) query.set('q', params.q);
  if (params.learningDomain) query.set('learningDomain', params.learningDomain);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedCoursesDto>(`/academy/courses${suffix}`, { accessToken });
}

export function getCourse(accessToken: string, courseId: string): Promise<CourseDto> {
  return apiRequest<CourseDto>(`/academy/courses/${courseId}`, { accessToken });
}

export interface ModuleDto {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export function listModules(accessToken: string, courseId: string): Promise<ModuleDto[]> {
  return apiRequest<ModuleDto[]>(`/academy/courses/${courseId}/modules`, { accessToken });
}

export interface LessonDto {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  position: number;
  estimatedDurationMinutes: number | null;
  relatedArticleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listLessons(accessToken: string, moduleId: string): Promise<LessonDto[]> {
  return apiRequest<LessonDto[]>(`/academy/modules/${moduleId}/lessons`, { accessToken });
}

export interface LearningPathDto {
  id: string;
  pathRef: string | null;
  title: string;
  shortDescription: string;
  fullDescription: string;
  status: AcademyContentStatus;
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  authorId: string;
  lastUpdatedById: string;
  datePublished: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLearningPathsDto {
  data: LearningPathDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListLearningPathsParams {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: 'newest' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
}

export function listLearningPaths(
  accessToken: string,
  params: ListLearningPathsParams = {},
): Promise<PaginatedLearningPathsDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.q) query.set('q', params.q);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedLearningPathsDto>(`/academy/learning-paths${suffix}`, { accessToken });
}

export interface PathCourseDto {
  id: string;
  learningPathId: string;
  courseId: string;
  position: number;
  createdAt: string;
}

export function listPathCourses(accessToken: string, learningPathId: string): Promise<PathCourseDto[]> {
  return apiRequest<PathCourseDto[]>(`/academy/learning-paths/${learningPathId}/courses`, { accessToken });
}

export interface EnrollmentDto {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export function enrollInCourse(accessToken: string, courseId: string): Promise<EnrollmentDto> {
  return apiRequest<EnrollmentDto>(`/academy/courses/${courseId}/enroll`, { method: 'POST', accessToken });
}

export function listMyEnrollments(accessToken: string): Promise<EnrollmentDto[]> {
  return apiRequest<EnrollmentDto[]>('/academy/enrollments/me', { accessToken });
}

export interface LessonProgressDto {
  id: string;
  enrollmentId: string;
  lessonId: string;
  status: LessonProgressStatus;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export function listEnrollmentProgress(accessToken: string, enrollmentId: string): Promise<LessonProgressDto[]> {
  return apiRequest<LessonProgressDto[]>(`/academy/enrollments/${enrollmentId}/progress`, { accessToken });
}

export function updateLessonProgress(
  accessToken: string,
  enrollmentId: string,
  lessonId: string,
  status: LessonProgressStatus,
): Promise<LessonProgressDto> {
  return apiRequest<LessonProgressDto>(`/academy/enrollments/${enrollmentId}/lessons/${lessonId}/progress`, {
    method: 'PATCH',
    accessToken,
    body: { status },
  });
}

export interface CertificationDto {
  id: string;
  userId: string;
  courseId: string;
  certificateRef: string | null;
  issuedAt: string;
}

export function listMyCertifications(accessToken: string): Promise<CertificationDto[]> {
  return apiRequest<CertificationDto[]>('/academy/certifications/me', { accessToken });
}

export interface AcademyGuidanceDto {
  content: string;
  requestId: string;
}

/**
 * "How does this course relate to my own goals?" — the AI Steward's
 * mentor voice for a specific course (ADR-015 §Academy Guidance). The
 * request is inherently caller-scoped (grounded in the caller's own
 * Journey), so nothing about it is cacheable across members.
 */
export function getCourseGuidance(accessToken: string, courseId: string): Promise<AcademyGuidanceDto> {
  return apiRequest<AcademyGuidanceDto>(`/ai/academy/courses/${courseId}/guidance`, {
    method: 'POST',
    accessToken,
  });
}
