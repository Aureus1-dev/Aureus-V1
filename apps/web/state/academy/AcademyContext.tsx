'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  enrollInCourse,
  getCourse,
  getCourseGuidance,
  listCourses,
  listEnrollmentProgress,
  listLearningPaths,
  listLessons,
  listModules,
  listMyCertifications,
  listMyEnrollments,
  listPathCourses,
  updateLessonProgress as updateLessonProgressApi,
  type CertificationDto,
  type CourseDto,
  type EnrollmentDto,
  type LearningPathDto,
  type LessonDto,
  type LessonProgressDto,
  type LessonProgressStatus,
  type ListCoursesParams,
  type ListLearningPathsParams,
  type ModuleDto,
  type PathCourseDto,
} from '../../lib/api/academy';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type AcademyErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface AcademyError {
  kind: AcademyErrorKind;
  message: string;
  retryable: boolean;
}

interface ResultsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A member's growth, not their consumption — deliberately not "percent complete" alone (Founder Decision 3). */
export interface GrowthSummary {
  lessonsCompleted: number;
  areasExplored: string[];
  skillsPracticed: number;
  certificationsEarned: number;
  currentJourney: Array<{ enrollment: EnrollmentDto; course: CourseDto | null }>;
}

interface State {
  catalogQuery: ListCoursesParams;
  catalogResults: CourseDto[];
  catalogMeta: ResultsMeta | null;
  isSearchingCatalog: boolean;
  isLoadingMoreCatalog: boolean;

  learningPaths: LearningPathDto[];
  isLoadingLearningPaths: boolean;
  pathCoursesByPathId: Record<string, PathCourseDto[]>;

  coursesById: Record<string, CourseDto>;
  modulesByCourseId: Record<string, ModuleDto[]>;
  lessonsByModuleId: Record<string, LessonDto[]>;
  isLoadingCourseDetail: boolean;

  enrollmentsByCourseId: Record<string, EnrollmentDto>;
  isLoadingEnrollments: boolean;
  progressByEnrollmentId: Record<string, LessonProgressDto[]>;

  certifications: CertificationDto[];
  isLoadingCertifications: boolean;

  guidanceByCourseId: Record<string, string>;
  loadingGuidanceForCourseId: string | null;

  error: AcademyError | null;
}

type Action =
  | { type: 'catalog/search/start'; query: ListCoursesParams }
  | { type: 'catalog/search/success'; results: CourseDto[]; meta: ResultsMeta }
  | { type: 'catalog/more/start' }
  | { type: 'catalog/more/success'; results: CourseDto[]; meta: ResultsMeta }
  | { type: 'learningPaths/loading' }
  | { type: 'learningPaths/loaded'; paths: LearningPathDto[] }
  | { type: 'pathCourses/loaded'; learningPathId: string; pathCourses: PathCourseDto[] }
  | { type: 'courseDetail/start' }
  | { type: 'courseDetail/success'; course: CourseDto; modules: ModuleDto[]; lessonsByModuleId: Record<string, LessonDto[]> }
  | { type: 'courses/cache'; courses: CourseDto[] }
  | { type: 'enrollments/loading' }
  | { type: 'enrollments/loaded'; enrollments: EnrollmentDto[] }
  | { type: 'enrollment/upserted'; enrollment: EnrollmentDto }
  | { type: 'progress/loaded'; enrollmentId: string; progress: LessonProgressDto[] }
  | { type: 'certifications/loading' }
  | { type: 'certifications/loaded'; certifications: CertificationDto[] }
  | { type: 'guidance/start'; courseId: string }
  | { type: 'guidance/success'; courseId: string; content: string }
  | { type: 'error'; error: AcademyError }
  | { type: 'error/clear' };

const initialState: State = {
  catalogQuery: {},
  catalogResults: [],
  catalogMeta: null,
  isSearchingCatalog: false,
  isLoadingMoreCatalog: false,

  learningPaths: [],
  isLoadingLearningPaths: false,
  pathCoursesByPathId: {},

  coursesById: {},
  modulesByCourseId: {},
  lessonsByModuleId: {},
  isLoadingCourseDetail: false,

  enrollmentsByCourseId: {},
  isLoadingEnrollments: false,
  progressByEnrollmentId: {},

  certifications: [],
  isLoadingCertifications: false,

  guidanceByCourseId: {},
  loadingGuidanceForCourseId: null,

  error: null,
};

function cacheCourses(coursesById: Record<string, CourseDto>, courses: CourseDto[]): Record<string, CourseDto> {
  const next = { ...coursesById };
  for (const course of courses) next[course.id] = course;
  return next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'catalog/search/start':
      return { ...state, isSearchingCatalog: true, catalogQuery: action.query, error: null };
    case 'catalog/search/success':
      return {
        ...state,
        isSearchingCatalog: false,
        catalogResults: action.results,
        catalogMeta: action.meta,
        coursesById: cacheCourses(state.coursesById, action.results),
      };
    case 'catalog/more/start':
      return { ...state, isLoadingMoreCatalog: true };
    case 'catalog/more/success':
      return {
        ...state,
        isLoadingMoreCatalog: false,
        catalogResults: [...state.catalogResults, ...action.results],
        catalogMeta: action.meta,
        coursesById: cacheCourses(state.coursesById, action.results),
      };
    case 'learningPaths/loading':
      return { ...state, isLoadingLearningPaths: true };
    case 'learningPaths/loaded':
      return { ...state, isLoadingLearningPaths: false, learningPaths: action.paths };
    case 'pathCourses/loaded':
      return {
        ...state,
        pathCoursesByPathId: { ...state.pathCoursesByPathId, [action.learningPathId]: action.pathCourses },
      };
    case 'courseDetail/start':
      return { ...state, isLoadingCourseDetail: true, error: null };
    case 'courseDetail/success':
      return {
        ...state,
        isLoadingCourseDetail: false,
        coursesById: cacheCourses(state.coursesById, [action.course]),
        modulesByCourseId: { ...state.modulesByCourseId, [action.course.id]: action.modules },
        lessonsByModuleId: { ...state.lessonsByModuleId, ...action.lessonsByModuleId },
      };
    case 'courses/cache':
      return { ...state, coursesById: cacheCourses(state.coursesById, action.courses) };
    case 'enrollments/loading':
      return { ...state, isLoadingEnrollments: true };
    case 'enrollments/loaded': {
      const enrollmentsByCourseId: Record<string, EnrollmentDto> = {};
      for (const enrollment of action.enrollments) enrollmentsByCourseId[enrollment.courseId] = enrollment;
      return { ...state, isLoadingEnrollments: false, enrollmentsByCourseId };
    }
    case 'enrollment/upserted':
      return {
        ...state,
        enrollmentsByCourseId: { ...state.enrollmentsByCourseId, [action.enrollment.courseId]: action.enrollment },
      };
    case 'progress/loaded':
      return {
        ...state,
        progressByEnrollmentId: { ...state.progressByEnrollmentId, [action.enrollmentId]: action.progress },
      };
    case 'certifications/loading':
      return { ...state, isLoadingCertifications: true };
    case 'certifications/loaded':
      return { ...state, isLoadingCertifications: false, certifications: action.certifications };
    case 'guidance/start':
      return { ...state, loadingGuidanceForCourseId: action.courseId };
    case 'guidance/success':
      return {
        ...state,
        loadingGuidanceForCourseId: null,
        guidanceByCourseId: { ...state.guidanceByCourseId, [action.courseId]: action.content },
      };
    case 'error':
      return {
        ...state,
        isSearchingCatalog: false,
        isLoadingMoreCatalog: false,
        isLoadingLearningPaths: false,
        isLoadingCourseDetail: false,
        isLoadingEnrollments: false,
        isLoadingCertifications: false,
        loadingGuidanceForCourseId: null,
        error: action.error,
      };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): AcademyError {
  if (error instanceof ApiError) {
    if (error.isAuthenticationRequired) return { kind: 'authentication', message: error.message, retryable: false };
    if (error.isRateLimited) return { kind: 'rate-limited', message: error.message, retryable: true };
    if (error.isServiceUnavailable) return { kind: 'unavailable', message: error.message, retryable: true };
    if (error.isValidationError) return { kind: 'validation', message: error.message, retryable: false };
    return { kind: 'unknown', message: error.message, retryable: error.retryable };
  }
  if (error instanceof NetworkError) return { kind: 'network', message: error.message, retryable: true };
  return { kind: 'unknown', message: 'Something unexpected happened.', retryable: true };
}

interface AcademyContextValue {
  state: State;
  searchCourses: (params: ListCoursesParams) => Promise<void>;
  loadMoreCourses: () => Promise<void>;
  loadLearningPaths: (params?: ListLearningPathsParams) => Promise<void>;
  loadPathCourses: (learningPathId: string) => Promise<void>;
  loadCourseDetail: (courseId: string) => Promise<void>;
  enroll: (courseId: string) => Promise<void>;
  loadMyEnrollments: () => Promise<void>;
  loadProgress: (enrollmentId: string) => Promise<void>;
  markLessonProgress: (enrollmentId: string, lessonId: string, status: LessonProgressStatus) => Promise<void>;
  loadCertifications: () => Promise<void>;
  loadCourseGuidance: (courseId: string) => Promise<void>;
  growthSummary: GrowthSummary;
  clearError: () => void;
}

const AcademyContext = createContext<AcademyContextValue | null>(null);

export function AcademyProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const searchCourses = useCallback(
    async (params: ListCoursesParams) => {
      if (!session.accessToken) return;
      dispatch({ type: 'catalog/search/start', query: params });
      try {
        const result = await listCourses(session.accessToken, params);
        dispatch({
          type: 'catalog/search/success',
          results: result.data,
          meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
        });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadMoreCourses = useCallback(async () => {
    if (!session.accessToken || !state.catalogMeta || state.isLoadingMoreCatalog) return;
    if (state.catalogMeta.page >= state.catalogMeta.totalPages) return;
    dispatch({ type: 'catalog/more/start' });
    try {
      const nextPage = state.catalogMeta.page + 1;
      const result = await listCourses(session.accessToken, { ...state.catalogQuery, page: nextPage });
      dispatch({
        type: 'catalog/more/success',
        results: result.data,
        meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
      });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken, state.catalogMeta, state.catalogQuery, state.isLoadingMoreCatalog]);

  const loadLearningPaths = useCallback(
    async (params: ListLearningPathsParams = {}) => {
      if (!session.accessToken) return;
      dispatch({ type: 'learningPaths/loading' });
      try {
        const result = await listLearningPaths(session.accessToken, params);
        dispatch({ type: 'learningPaths/loaded', paths: result.data });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadPathCourses = useCallback(
    async (learningPathId: string) => {
      if (!session.accessToken) return;
      try {
        const pathCourses = await listPathCourses(session.accessToken, learningPathId);
        dispatch({ type: 'pathCourses/loaded', learningPathId, pathCourses });
        const courses = await Promise.all(
          pathCourses.map((pc) => getCourse(session.accessToken!, pc.courseId)),
        );
        dispatch({ type: 'courses/cache', courses });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadCourseDetail = useCallback(
    async (courseId: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'courseDetail/start' });
      try {
        const [course, modules] = await Promise.all([
          getCourse(session.accessToken, courseId),
          listModules(session.accessToken, courseId),
        ]);
        const lessonLists = await Promise.all(
          modules.map((module) => listLessons(session.accessToken!, module.id)),
        );
        const lessonsByModuleId: Record<string, LessonDto[]> = {};
        modules.forEach((module, index) => {
          lessonsByModuleId[module.id] = lessonLists[index];
        });
        dispatch({ type: 'courseDetail/success', course, modules, lessonsByModuleId });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const enroll = useCallback(
    async (courseId: string) => {
      if (!session.accessToken) return;
      try {
        const enrollment = await enrollInCourse(session.accessToken, courseId);
        dispatch({ type: 'enrollment/upserted', enrollment });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadMyEnrollments = useCallback(async () => {
    if (!session.accessToken) return;
    dispatch({ type: 'enrollments/loading' });
    try {
      const enrollments = await listMyEnrollments(session.accessToken);
      dispatch({ type: 'enrollments/loaded', enrollments });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const loadProgress = useCallback(
    async (enrollmentId: string) => {
      if (!session.accessToken) return;
      try {
        const progress = await listEnrollmentProgress(session.accessToken, enrollmentId);
        dispatch({ type: 'progress/loaded', enrollmentId, progress });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadCertifications = useCallback(async () => {
    if (!session.accessToken) return;
    dispatch({ type: 'certifications/loading' });
    try {
      const certifications = await listMyCertifications(session.accessToken);
      dispatch({ type: 'certifications/loaded', certifications });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const markLessonProgress = useCallback(
    async (enrollmentId: string, lessonId: string, status: LessonProgressStatus) => {
      if (!session.accessToken) return;
      try {
        const progress = await updateLessonProgressApi(session.accessToken, enrollmentId, lessonId, status);
        const existing = state.progressByEnrollmentId[enrollmentId] ?? [];
        const next = existing.some((p) => p.lessonId === lessonId)
          ? existing.map((p) => (p.lessonId === lessonId ? progress : p))
          : [...existing, progress];
        dispatch({ type: 'progress/loaded', enrollmentId, progress: next });

        if (status === 'COMPLETED') {
          // A lesson completing may have just auto-completed the course and
          // issued a certification server-side — the progress response
          // alone doesn't say so, refresh both to pick it up.
          const [enrollments, certifications] = await Promise.all([
            listMyEnrollments(session.accessToken),
            listMyCertifications(session.accessToken),
          ]);
          dispatch({ type: 'enrollments/loaded', enrollments });
          dispatch({ type: 'certifications/loaded', certifications });
        }
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, state.progressByEnrollmentId],
  );

  const loadCourseGuidance = useCallback(
    async (courseId: string) => {
      if (!session.accessToken || state.guidanceByCourseId[courseId]) return;
      dispatch({ type: 'guidance/start', courseId });
      try {
        const guidance = await getCourseGuidance(session.accessToken, courseId);
        dispatch({ type: 'guidance/success', courseId, content: guidance.content });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, state.guidanceByCourseId],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const growthSummary = useMemo<GrowthSummary>(() => {
    const enrollments = Object.values(state.enrollmentsByCourseId);
    let lessonsCompleted = 0;
    const modulesTouched = new Set<string>();
    for (const enrollment of enrollments) {
      const progress = state.progressByEnrollmentId[enrollment.id] ?? [];
      for (const entry of progress) {
        if (entry.status !== 'NOT_STARTED') {
          const lesson = Object.values(state.lessonsByModuleId)
            .flat()
            .find((l) => l.id === entry.lessonId);
          if (lesson) modulesTouched.add(lesson.moduleId);
        }
        if (entry.status === 'COMPLETED') lessonsCompleted += 1;
      }
    }
    const areasExplored = Array.from(
      new Set(
        enrollments
          .map((e) => state.coursesById[e.courseId]?.learningDomain)
          .filter((domain): domain is CourseDto['learningDomain'] => !!domain),
      ),
    );
    const currentJourney = enrollments
      .filter((e) => e.status === 'ACTIVE')
      .map((e) => ({ enrollment: e, course: state.coursesById[e.courseId] ?? null }));

    return {
      lessonsCompleted,
      areasExplored,
      skillsPracticed: modulesTouched.size,
      certificationsEarned: state.certifications.length,
      currentJourney,
    };
  }, [state.enrollmentsByCourseId, state.progressByEnrollmentId, state.lessonsByModuleId, state.coursesById, state.certifications]);

  const value = useMemo(
    () => ({
      state,
      searchCourses,
      loadMoreCourses,
      loadLearningPaths,
      loadPathCourses,
      loadCourseDetail,
      enroll,
      loadMyEnrollments,
      loadProgress,
      markLessonProgress,
      loadCertifications,
      loadCourseGuidance,
      growthSummary,
      clearError,
    }),
    [
      state,
      searchCourses,
      loadMoreCourses,
      loadLearningPaths,
      loadPathCourses,
      loadCourseDetail,
      enroll,
      loadMyEnrollments,
      loadProgress,
      markLessonProgress,
      loadCertifications,
      loadCourseGuidance,
      growthSummary,
      clearError,
    ],
  );

  return <AcademyContext.Provider value={value}>{children}</AcademyContext.Provider>;
}

export function useAcademy(): AcademyContextValue {
  const context = useContext(AcademyContext);
  if (!context) {
    throw new Error('useAcademy must be used within an AcademyProvider');
  }
  return context;
}
