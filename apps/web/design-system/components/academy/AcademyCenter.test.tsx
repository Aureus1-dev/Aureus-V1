import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { AcademyProvider } from '../../../state/academy/AcademyContext';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { AcademyCenter } from './AcademyCenter';

import * as academyApi from '../../../lib/api/academy';
import * as recommendationsApi from '../../../lib/api/recommendations';

import type { CourseDto, LessonDto, ModuleDto } from '../../../lib/api/academy';

jest.mock('../../../lib/api/academy');
jest.mock('../../../lib/api/recommendations');

const mockedAcademy = academyApi as jest.Mocked<typeof academyApi>;
const mockedRecommendations = recommendationsApi as jest.Mocked<typeof recommendationsApi>;

const course: CourseDto = {
  id: 'course-1', courseRef: 'AUR-CRS-000001', title: 'Financial Foundations', shortDescription: 'Build good money habits.',
  fullDescription: 'A full introduction to personal finance.', learningDomain: 'FINANCIAL_LITERACY',
  estimatedDurationMinutes: 60, status: 'ACTIVE', verificationStatus: 'VERIFIED', rejectionReason: null, version: 1,
  grantsCertification: true, organizationId: null, authorId: 'steward-1', lastUpdatedById: 'steward-1',
  datePublished: 'x', createdAt: 'x', updatedAt: 'x',
};

const learningModule: ModuleDto = {
  id: 'mod-1', courseId: 'course-1', title: 'Getting Started', description: null, position: 0, createdAt: 'x', updatedAt: 'x',
};

const lesson: LessonDto = {
  id: 'lesson-1', moduleId: 'mod-1', title: 'What is a Budget?', content: 'A budget is a plan for your money.',
  position: 0, estimatedDurationMinutes: 10, relatedArticleId: null, createdAt: 'x', updatedAt: 'x',
};

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderCenter() {
  return render(
    <SessionProvider>
      <AcademyProvider>
        <RecommendationsProvider>
          <SignedInAs>
            <AcademyCenter />
          </SignedInAs>
        </RecommendationsProvider>
      </AcademyProvider>
    </SessionProvider>,
  );
}

describe('AcademyCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAcademy.listCourses.mockResolvedValue({ data: [course], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedAcademy.listLearningPaths.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedAcademy.listMyEnrollments.mockResolvedValue([]);
    mockedAcademy.listMyCertifications.mockResolvedValue([]);
    mockedAcademy.getCourse.mockResolvedValue(course);
    mockedAcademy.listModules.mockResolvedValue([learningModule]);
    mockedAcademy.listLessons.mockResolvedValue([lesson]);
    mockedRecommendations.listRecommendations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it('asks a signed-out visitor to sign in', () => {
    render(
      <SessionProvider>
        <AcademyProvider>
          <RecommendationsProvider>
            <AcademyCenter />
          </RecommendationsProvider>
        </AcademyProvider>
      </SessionProvider>,
    );
    expect(screen.getByText('Sign in to visit the Academy')).toBeInTheDocument();
  });

  it(
    "lets a member accomplish the Domain's primary purpose end-to-end: discover a course, hear from their Steward " +
      'why it matters, enroll, read a lesson and reflect, mark it complete, and see it reflected in their own growth ' +
      '— all from one screen',
    async () => {
      mockedAcademy.enrollInCourse.mockResolvedValue({
        id: 'enr-1', userId: 'member-1', courseId: 'course-1', status: 'ACTIVE', enrolledAt: 'x', completedAt: null, updatedAt: 'x',
      });
      mockedAcademy.listEnrollmentProgress.mockResolvedValue([]);
      mockedAcademy.getCourseGuidance.mockResolvedValue({
        content: 'This builds directly toward your savings goal.', requestId: 'req-1',
      });
      mockedAcademy.updateLessonProgress
        .mockResolvedValueOnce({
          id: 'prog-1', enrollmentId: 'enr-1', lessonId: 'lesson-1', status: 'IN_PROGRESS', startedAt: 'x', completedAt: null, updatedAt: 'x',
        })
        .mockResolvedValueOnce({
          id: 'prog-1', enrollmentId: 'enr-1', lessonId: 'lesson-1', status: 'COMPLETED', startedAt: 'x', completedAt: 'x', updatedAt: 'x',
        });

      renderCenter();

      // Discover, from Grow — framed around growth, not a course catalog.
      expect(await screen.findByText('I want to grow')).toBeInTheDocument();

      // Explore, find the course, and open it.
      await userEvent.click(screen.getByRole('tab', { name: 'Explore' }));
      expect(await screen.findByText('Financial Foundations')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Explore this course' }));

      // Hear from the Steward why it matters — never auto-generated.
      expect(mockedAcademy.getCourseGuidance).not.toHaveBeenCalled();
      await userEvent.click(await screen.findByRole('button', { name: 'Ask your Steward' }));
      expect(await screen.findByText('This builds directly toward your savings goal.')).toBeInTheDocument();

      // Enroll.
      await userEvent.click(screen.getByRole('button', { name: 'Enroll' }));
      expect(mockedAcademy.enrollInCourse).toHaveBeenCalledWith('token-123', 'course-1');
      expect(await screen.findByText("You're enrolled in this course.")).toBeInTheDocument();

      // Read the lesson — reflection, not a quiz — and complete it.
      await userEvent.click(screen.getByRole('button', { name: 'What is a Budget?' }));
      expect(await screen.findByText('A budget is a plan for your money.')).toBeInTheDocument();
      expect(mockedAcademy.updateLessonProgress).toHaveBeenCalledWith('token-123', 'enr-1', 'lesson-1', 'IN_PROGRESS');

      mockedAcademy.listMyEnrollments.mockResolvedValue([
        { id: 'enr-1', userId: 'member-1', courseId: 'course-1', status: 'COMPLETED', enrolledAt: 'x', completedAt: 'x', updatedAt: 'x' },
      ]);
      mockedAcademy.listMyCertifications.mockResolvedValue([
        { id: 'cert-1', userId: 'member-1', courseId: 'course-1', certificateRef: 'AUR-CERT-000001', issuedAt: 'x' },
      ]);
      await userEvent.click(screen.getByRole('button', { name: "I've completed this lesson" }));
      expect(mockedAcademy.updateLessonProgress).toHaveBeenLastCalledWith('token-123', 'enr-1', 'lesson-1', 'COMPLETED');

      // Growth, not just completion, shows up on My Learning.
      await userEvent.click(screen.getByRole('tab', { name: 'My Learning' }));
      expect(await screen.findByText('AUR-CERT-000001')).toBeInTheDocument();
      const panel = document.getElementById('academy-panel-my-learning')!;
      expect(within(panel).getByText('Certifications earned').previousElementSibling).toHaveTextContent('1');
      expect(within(panel).getByText('Lessons completed').previousElementSibling).toHaveTextContent('1');

      // Back to Grow — the tab did not lose state.
      await userEvent.click(screen.getByRole('tab', { name: 'Grow' }));
      expect(screen.getByText('I want to grow')).toBeInTheDocument();
    },
  );

  it('has no accessibility violations', async () => {
    const { container } = renderCenter();
    await screen.findByText('I want to grow');
    expect(await axe(container)).toHaveNoViolations();
  });
});
