import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { AcademyProvider, useAcademy } from './AcademyContext';
import * as academyApi from '../../lib/api/academy';
import type { CourseDto, EnrollmentDto, LessonProgressDto } from '../../lib/api/academy';

jest.mock('../../lib/api/academy');

const mockedAcademy = academyApi as jest.Mocked<typeof academyApi>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useAcademy> & { setToken: (t: string) => void }) => void }) {
  const academy = useAcademy();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...academy,
      setToken: (token: string) => setSession({ ...session, isAuthenticated: true, accessToken: token, memberId: 'member-1' }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academy, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useAcademy> & { setToken: (t: string) => void };
  render(
    <SessionProvider>
      <AcademyProvider>
        <Harness onReady={(value) => (api = value)} />
      </AcademyProvider>
    </SessionProvider>,
  );
  return () => api;
}

function makeCourse(o: Partial<CourseDto>): CourseDto {
  return {
    id: 'course-1', courseRef: 'AUR-CRS-000001', title: 'Financial Foundations', shortDescription: 'Build good money habits.',
    fullDescription: 'x', learningDomain: 'FINANCIAL_LITERACY', estimatedDurationMinutes: 60, status: 'ACTIVE',
    verificationStatus: 'VERIFIED', rejectionReason: null, version: 1, grantsCertification: true, organizationId: null,
    authorId: 'steward-1', lastUpdatedById: 'steward-1', datePublished: 'x', createdAt: 'x', updatedAt: 'x', ...o,
  };
}

function makeEnrollment(o: Partial<EnrollmentDto>): EnrollmentDto {
  return {
    id: 'enr-1', userId: 'member-1', courseId: 'course-1', status: 'ACTIVE', enrolledAt: 'x', completedAt: null,
    updatedAt: 'x', ...o,
  };
}

describe('AcademyContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches courses and stores results with pagination metadata', async () => {
    mockedAcademy.listCourses.mockResolvedValue({ data: [makeCourse({})], total: 1, page: 1, limit: 20, totalPages: 1 });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().searchCourses({ q: 'financial' });
    });

    expect(mockedAcademy.listCourses).toHaveBeenCalledWith('token-123', { q: 'financial' });
    expect(getApi().state.catalogResults).toEqual([makeCourse({})]);
    expect(getApi().state.coursesById['course-1']).toEqual(makeCourse({}));
  });

  it('enrolls in a course and reflects it by courseId', async () => {
    mockedAcademy.enrollInCourse.mockResolvedValue(makeEnrollment({}));

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().enroll('course-1');
    });

    expect(mockedAcademy.enrollInCourse).toHaveBeenCalledWith('token-123', 'course-1');
    expect(getApi().state.enrollmentsByCourseId['course-1']).toEqual(makeEnrollment({}));
  });

  it('marking a lesson complete refreshes enrollments and certifications, catching a server-side auto-completion', async () => {
    const progress: LessonProgressDto = {
      id: 'prog-1', enrollmentId: 'enr-1', lessonId: 'lesson-1', status: 'COMPLETED', startedAt: 'x',
      completedAt: 'x', updatedAt: 'x',
    };
    mockedAcademy.updateLessonProgress.mockResolvedValue(progress);
    mockedAcademy.listMyEnrollments.mockResolvedValue([makeEnrollment({ status: 'COMPLETED', completedAt: 'x' })]);
    mockedAcademy.listMyCertifications.mockResolvedValue([
      { id: 'cert-1', userId: 'member-1', courseId: 'course-1', certificateRef: 'AUR-CERT-000001', issuedAt: 'x' },
    ]);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().markLessonProgress('enr-1', 'lesson-1', 'COMPLETED');
    });

    expect(mockedAcademy.updateLessonProgress).toHaveBeenCalledWith('token-123', 'enr-1', 'lesson-1', 'COMPLETED');
    expect(getApi().state.progressByEnrollmentId['enr-1']).toEqual([progress]);
    expect(mockedAcademy.listMyEnrollments).toHaveBeenCalled();
    expect(mockedAcademy.listMyCertifications).toHaveBeenCalled();
    expect(getApi().state.enrollmentsByCourseId['course-1'].status).toBe('COMPLETED');
    expect(getApi().state.certifications).toHaveLength(1);
  });

  it('does not refresh enrollments/certifications for a non-completing progress update', async () => {
    const progress: LessonProgressDto = {
      id: 'prog-1', enrollmentId: 'enr-1', lessonId: 'lesson-1', status: 'IN_PROGRESS', startedAt: 'x',
      completedAt: null, updatedAt: 'x',
    };
    mockedAcademy.updateLessonProgress.mockResolvedValue(progress);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().markLessonProgress('enr-1', 'lesson-1', 'IN_PROGRESS');
    });

    expect(mockedAcademy.listMyEnrollments).not.toHaveBeenCalled();
    expect(mockedAcademy.listMyCertifications).not.toHaveBeenCalled();
  });

  it('caches AI course guidance and never re-requests it once loaded', async () => {
    mockedAcademy.getCourseGuidance.mockResolvedValue({ content: 'This builds toward your savings goal.', requestId: 'req-1' });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().loadCourseGuidance('course-1');
    });
    await act(async () => {
      await getApi().loadCourseGuidance('course-1');
    });

    expect(mockedAcademy.getCourseGuidance).toHaveBeenCalledTimes(1);
    expect(getApi().state.guidanceByCourseId['course-1']).toBe('This builds toward your savings goal.');
  });

  it('derives a growth summary from enrollments, progress, and certifications rather than a bare percentage', async () => {
    mockedAcademy.listCourses.mockResolvedValue({ data: [makeCourse({})], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedAcademy.enrollInCourse.mockResolvedValue(makeEnrollment({}));
    mockedAcademy.getCourse.mockResolvedValue(makeCourse({}));
    mockedAcademy.listModules.mockResolvedValue([
      { id: 'mod-1', courseId: 'course-1', title: 'Module 1', description: null, position: 0, createdAt: 'x', updatedAt: 'x' },
    ]);
    mockedAcademy.listLessons.mockResolvedValue([
      { id: 'lesson-1', moduleId: 'mod-1', title: 'Lesson 1', content: 'x', position: 0, estimatedDurationMinutes: null, relatedArticleId: null, createdAt: 'x', updatedAt: 'x' },
    ]);
    mockedAcademy.updateLessonProgress.mockResolvedValue({
      id: 'prog-1', enrollmentId: 'enr-1', lessonId: 'lesson-1', status: 'COMPLETED', startedAt: 'x', completedAt: 'x', updatedAt: 'x',
    });
    mockedAcademy.listMyEnrollments.mockResolvedValue([makeEnrollment({})]);
    mockedAcademy.listMyCertifications.mockResolvedValue([]);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().searchCourses({});
      await getApi().enroll('course-1');
      await getApi().loadCourseDetail('course-1');
      await getApi().markLessonProgress('enr-1', 'lesson-1', 'COMPLETED');
    });

    const summary = getApi().growthSummary;
    expect(summary.lessonsCompleted).toBe(1);
    expect(summary.skillsPracticed).toBe(1);
    expect(summary.areasExplored).toEqual(['FINANCIAL_LITERACY']);
  });
});
