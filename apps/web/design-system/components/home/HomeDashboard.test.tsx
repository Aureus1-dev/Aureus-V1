import { render, screen, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { JourneyProvider } from '../../../state/journey/JourneyContext';
import { OpportunitiesProvider } from '../../../state/opportunities/OpportunitiesContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { NotificationsProvider } from '../../../state/notifications/NotificationsContext';
import { HomeDashboard } from './HomeDashboard';

import * as goalsApi from '../../../lib/api/goals';
import * as journeysApi from '../../../lib/api/journeys';
import * as milestonesApi from '../../../lib/api/milestones';
import * as tasksApi from '../../../lib/api/tasks';
import * as opportunitiesApi from '../../../lib/api/opportunities';
import * as savedApi from '../../../lib/api/saved-opportunities';
import * as conversationsApi from '../../../lib/api/conversations';
import * as notificationsApi from '../../../lib/api/notifications';
import * as profileApi from '../../../lib/api/profile';

import type { GoalDto } from '../../../lib/api/goals';
import type { JourneyDto } from '../../../lib/api/journeys';
import type { MilestoneDto } from '../../../lib/api/milestones';
import type { TaskDto } from '../../../lib/api/tasks';
import type { OpportunityDto } from '../../../lib/api/opportunities';

jest.mock('../../../lib/api/goals');
jest.mock('../../../lib/api/journeys');
jest.mock('../../../lib/api/milestones');
jest.mock('../../../lib/api/tasks');
jest.mock('../../../lib/api/opportunities');
jest.mock('../../../lib/api/saved-opportunities');
jest.mock('../../../lib/api/conversations');
jest.mock('../../../lib/api/notifications');
jest.mock('../../../lib/api/profile');

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));

const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;
const mockedJourneys = journeysApi as jest.Mocked<typeof journeysApi>;
const mockedMilestones = milestonesApi as jest.Mocked<typeof milestonesApi>;
const mockedTasks = tasksApi as jest.Mocked<typeof tasksApi>;
const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;
const mockedSaved = savedApi as jest.Mocked<typeof savedApi>;
const mockedConversations = conversationsApi as jest.Mocked<typeof conversationsApi>;
const mockedNotifications = notificationsApi as jest.Mocked<typeof notificationsApi>;
const mockedProfile = profileApi as jest.Mocked<typeof profileApi>;

const activeGoal: GoalDto = {
  id: 'g-1', title: 'Find a better job', status: 'ACTIVE', userId: 'member-1',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z', deletedAt: null,
};

const journey: JourneyDto = {
  id: 'j-1', goalId: 'g-1', title: 'Find a better job', status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
};

const milestone: MilestoneDto = {
  id: 'm-1', title: 'Prepare to apply', status: 'IN_PROGRESS', position: 0, journeyId: 'j-1',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
};

const task: TaskDto = {
  id: 't-1', title: 'Update your resume', status: 'PENDING', priority: 'MEDIUM', position: 0, milestoneId: 'm-1',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
};

function makeOpportunity(o: Partial<OpportunityDto>): OpportunityDto {
  return {
    id: 'o-1', opportunityRef: null, title: 'Community Grant', shortDescription: 'A short description',
    fullDescription: 'A full description', category: 'GRANT', tags: [], provider: 'City Fund',
    officialSourceUrl: 'https://example.com', applicationUrl: null, location: null, country: null, state: null,
    eligibilityRules: 'Open to all', benefitType: 'GRANT', benefitAmount: null, deadline: null, status: 'ACTIVE',
    verificationStatus: 'VERIFIED', rejectionReason: null, confidenceScore: 0.9, freshnessScore: 0.9,
    datePublished: null, dateLastVerified: null, sourceName: 'City Fund', sourceUrl: null, sourceType: 'ADMIN_ENTRY',
    submittedById: 'u-1', createdById: 'u-1', lastUpdatedById: 'u-1', createdAt: 'x', updatedAt: 'x', deletedAt: null,
    ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1', email: 'alice@example.com' });
  }
  return <>{children}</>;
}

function renderHome({ signedIn = true }: { signedIn?: boolean } = {}) {
  return render(
    <SessionProvider>
      <JourneyProvider>
        <OpportunitiesProvider>
          <ConversationProvider>
            <NotificationsProvider>
              {signedIn ? (
                <SignedInAs>
                  <HomeDashboard />
                </SignedInAs>
              ) : (
                <HomeDashboard />
              )}
            </NotificationsProvider>
          </ConversationProvider>
        </OpportunitiesProvider>
      </JourneyProvider>
    </SessionProvider>,
  );
}

function mockFullHome() {
  mockedGoals.listGoals.mockResolvedValue({ data: [activeGoal], total: 1, page: 1, limit: 20, totalPages: 1 });
  mockedJourneys.getJourneyByGoal.mockResolvedValue(journey);
  mockedMilestones.listMilestones.mockResolvedValue({ data: [milestone], total: 1, page: 1, limit: 20, totalPages: 1 });
  mockedTasks.listTasks.mockResolvedValue({ data: [task], total: 1, page: 1, limit: 20, totalPages: 1 });
  mockedOpportunities.listOpportunities.mockResolvedValue({
    data: [makeOpportunity({})], total: 1, page: 1, limit: 3, totalPages: 1,
  });
  mockedSaved.listSavedOpportunities.mockResolvedValue([]);
  mockedConversations.listConversations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  mockedNotifications.listNotifications.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
  mockedProfile.getMyProfile.mockResolvedValue(null);
}

describe('HomeDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks a signed-out visitor to sign in', () => {
    render(
      <SessionProvider>
        <JourneyProvider>
          <OpportunitiesProvider>
            <ConversationProvider>
              <NotificationsProvider>
                <HomeDashboard />
              </NotificationsProvider>
            </ConversationProvider>
          </OpportunitiesProvider>
        </JourneyProvider>
      </SessionProvider>,
    );

    expect(screen.getByText('Sign in to see your Home')).toBeInTheDocument();
  });

  it('directs a signed-in member with no mission yet to Welcome, not a broken dashboard', async () => {
    mockedGoals.listGoals.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    renderHome();

    expect(await screen.findByText("Let's get started")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Welcome' })).toHaveAttribute('href', '/welcome');
  });

  it(
    'lets a returning member accomplish the Domain\'s primary purpose end-to-end: see where things stand and reach ' +
      'their next step, their progress, an opportunity, and a way to talk to their steward, all from one screen',
    async () => {
      mockFullHome();

      renderHome();

      // Greeting
      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Good (morning|afternoon|evening)/);

      // Today's Next Step, drawn from the loaded milestone/task detail
      expect(await screen.findByText('Update your resume')).toBeInTheDocument();

      // Progress overview for the active goal
      expect(await screen.findByText((_, el) => el?.textContent === 'Progress on “Find a better job”')).toBeInTheDocument();

      // Active goal listed
      expect(screen.getByText('Find a better job')).toBeInTheDocument();

      // At least one opportunity highlight
      expect(await screen.findByText('Community Grant')).toBeInTheDocument();

      // Reachable without navigating away first: journey, opportunities, conversation, voice
      expect(screen.getAllByRole('link', { name: /journey/i }).length).toBeGreaterThan(0);
      expect(screen.getByRole('link', { name: 'Browse opportunities' })).toHaveAttribute('href', '/opportunities');
      expect(screen.getByRole('link', { name: 'Continue the conversation' })).toHaveAttribute('href', '/conversation');
      expect(screen.getByRole('link', { name: 'Talk out loud instead' })).toHaveAttribute(
        'href',
        '/conversation?mode=voice',
      );
    },
  );

  it('loads full journey detail for only the single most relevant active goal, not every goal (avoids N+1 fan-out)', async () => {
    const secondGoal: GoalDto = { ...activeGoal, id: 'g-2', title: 'Finish a course', updatedAt: '2026-01-05T00:00:00Z' };
    mockedGoals.listGoals.mockResolvedValue({ data: [activeGoal, secondGoal], total: 2, page: 1, limit: 20, totalPages: 1 });
    mockedJourneys.getJourneyByGoal.mockResolvedValue(journey);
    mockedMilestones.listMilestones.mockResolvedValue({ data: [milestone], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedTasks.listTasks.mockResolvedValue({ data: [task], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedOpportunities.listOpportunities.mockResolvedValue({ data: [], total: 0, page: 1, limit: 3, totalPages: 0 });
    mockedSaved.listSavedOpportunities.mockResolvedValue([]);
    mockedConversations.listConversations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedNotifications.listNotifications.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    mockedProfile.getMyProfile.mockResolvedValue(null);

    renderHome();

    expect(await screen.findByText('Find a better job')).toBeTruthy();
    await waitFor(() => expect(mockedJourneys.getJourneyByGoal).toHaveBeenCalledTimes(1));
    expect(mockedJourneys.getJourneyByGoal).toHaveBeenCalledWith('token-123', 'g-1');
    expect(await screen.findByText('Finish a course')).toBeInTheDocument();
  });

  it('has no accessibility violations on the fully populated dashboard', async () => {
    mockFullHome();
    const { container } = renderHome();
    await screen.findByText('Community Grant');
    expect(await axe(container)).toHaveNoViolations();
  });
});
