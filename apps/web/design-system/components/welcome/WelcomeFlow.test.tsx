import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { JourneyProvider } from '../../../state/journey/JourneyContext';
import { OpportunitiesProvider } from '../../../state/opportunities/OpportunitiesContext';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { PlanProvider } from '../../../state/plan/PlanContext';
import { ThemeProvider } from '../../theme';
import { WelcomeFlow } from './WelcomeFlow';
import * as goalsApi from '../../../lib/api/goals';
import * as journeysApi from '../../../lib/api/journeys';
import * as milestonesApi from '../../../lib/api/milestones';
import * as tasksApi from '../../../lib/api/tasks';
import * as consentApi from '../../../lib/api/consent';
import * as conversationsApi from '../../../lib/api/conversations';
import { CURRENT_CONSENT_VERSION } from '../../../lib/config/consent';
import { NetworkError } from '../../../lib/api/errors';

jest.mock('../../../lib/api/goals');
jest.mock('../../../lib/api/journeys');
jest.mock('../../../lib/api/milestones');
jest.mock('../../../lib/api/tasks');
jest.mock('../../../lib/api/opportunities');
jest.mock('../../../lib/api/saved-opportunities');
jest.mock('../../../lib/api/recommendations');
jest.mock('../../../lib/api/consent');
jest.mock('../../../lib/api/conversations');

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;
const mockedJourneys = journeysApi as jest.Mocked<typeof journeysApi>;
const mockedMilestones = milestonesApi as jest.Mocked<typeof milestonesApi>;
const mockedTasks = tasksApi as jest.Mocked<typeof tasksApi>;
const mockedConsent = consentApi as jest.Mocked<typeof consentApi>;
const mockedConversations = conversationsApi as jest.Mocked<typeof conversationsApi>;

const activeGoal = {
  id: 'goal-1',
  title: 'Find a better job',
  status: 'ACTIVE' as const,
  userId: 'member-1',
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};
const newGoal = {
  id: 'goal-2',
  title: 'Find housing',
  status: 'ACTIVE' as const,
  userId: 'member-1',
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};
const newJourney = {
  id: 'journey-2',
  title: 'Find housing',
  status: 'ACTIVE' as const,
  goalId: 'goal-2',
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};
const newMilestone = {
  id: 'milestone-2',
  title: 'Get started',
  status: 'PENDING' as const,
  position: 0,
  journeyId: 'journey-2',
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};
const newTask = {
  id: 'task-2',
  title: 'Take the first step',
  status: 'PENDING' as const,
  priority: 'MEDIUM' as const,
  position: 0,
  milestoneId: 'milestone-2',
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};

function TestHarness({ forceNewMission }: { forceNewMission?: boolean }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({
      ...session,
      isAuthenticated: true,
      accessToken: 'token-123',
      memberId: 'member-1',
    });
  }
  return <WelcomeFlow forceNewMission={forceNewMission} />;
}

function renderFlow(forceNewMission?: boolean) {
  return render(
    <ThemeProvider>
      <SessionProvider>
        <JourneyProvider>
          <OpportunitiesProvider>
            <RecommendationsProvider>
              <ConversationProvider>
                <PlanProvider>
                  <TestHarness forceNewMission={forceNewMission} />
                </PlanProvider>
              </ConversationProvider>
            </RecommendationsProvider>
          </OpportunitiesProvider>
        </JourneyProvider>
      </SessionProvider>
    </ThemeProvider>,
  );
}

describe('WelcomeFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('redirects a returning member (one who already has goals) to Home rather than showing a second summary here', async () => {
    mockedGoals.listGoals.mockResolvedValue({
      data: [activeGoal],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderFlow();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
    expect(screen.queryByText('Welcome to Aureus')).not.toBeInTheDocument();
  });

  it('shows the guided first-run flow for a genuine first-run member with immediate help, not a tutorial', async () => {
    mockedGoals.listGoals.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    renderFlow();

    expect(await screen.findByText('What brings you to Aureus today?')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it(
    'never redirects a genuine first-run member to Home mid-arrival once their very first Goal is created — ' +
      '"returning" is decided once, from the initial load, not from the live goals count',
    async () => {
      mockedGoals.listGoals.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
      mockedGoals.createGoal.mockResolvedValue(newGoal);
      mockedJourneys.createJourney.mockResolvedValue(newJourney);
      mockedMilestones.createMilestone.mockResolvedValue(newMilestone);
      mockedTasks.createTask.mockResolvedValue(newTask);
      mockedConsent.grantConsent.mockResolvedValue({
        granted: true,
        isCurrentVersion: true,
        version: CURRENT_CONSENT_VERSION,
        grantedAt: 'x',
      });
      mockedConversations.createConversation.mockResolvedValue({
        id: 'conv-1',
        userId: 'member-1',
        title: null,
        createdAt: 'x',
        updatedAt: 'x',
      });
      mockedConversations.sendMessage.mockResolvedValueOnce({
        id: 'assistant-1',
        conversationId: 'conv-1',
        role: 'ASSISTANT',
        content: 'Got it — finding housing.',
        createdAt: 'x',
      });

      renderFlow();
      const user = userEvent.setup();

      expect(await screen.findByText('What brings you to Aureus today?')).toBeInTheDocument();
      await user.type(
        screen.getByLabelText('Your immediate need', { exact: false }),
        'Find housing',
      );
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() =>
        expect(screen.getByText("Here's what we understood")).toBeInTheDocument(),
      );
      await user.click(screen.getByRole('button', { name: "That's right — continue" }));
      await waitFor(() => expect(screen.getByText('Before we begin')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: 'I understand — continue' }));

      // The first Goal this member has ever had is created right here,
      // from inside this very mount — this must never be mistaken for
      // "a member who already had goals" and redirected away.
      await waitFor(() =>
        expect(screen.getByText('Your first mission is set')).toBeInTheDocument(),
      );
      expect(replace).not.toHaveBeenCalled();
    },
  );

  it('forceNewMission (from ?newMission=true) bypasses the Home redirect for a returning member and skips hospitality', async () => {
    mockedGoals.listGoals.mockResolvedValue({
      data: [activeGoal],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderFlow(true);

    expect(await screen.findByText('What brings you to Aureus today?')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText('Welcome to Aureus')).not.toBeInTheDocument();
  });

  it('B2: a repeat visit returns within three seconds — the redirect fires as soon as goals resolve, with no artificial delay in the path', async () => {
    mockedGoals.listGoals.mockResolvedValue({
      data: [activeGoal],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const startedAt = performance.now();
    renderFlow();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(3000);
  });

  it('B6: a member with a goal but an incomplete guided flow is resumed, not redirected to Home', async () => {
    mockedGoals.listGoals.mockResolvedValue({
      data: [activeGoal],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    window.localStorage.setItem('aureus.arrival.step', 'stewardship-offer');

    renderFlow();

    expect(
      await screen.findByRole('heading', { name: 'What Aureus does, and what stays yours' }),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('B8: a failure to load goals shows an honest, retryable error — never a silent guess at whether the member is new', async () => {
    mockedGoals.listGoals.mockRejectedValueOnce(new NetworkError());

    renderFlow();

    expect(await screen.findByText('Connection interrupted')).toBeInTheDocument();
    expect(screen.queryByText('Make this comfortable for you')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('B8: retrying a failed goals load recovers into the correct flow once it succeeds', async () => {
    mockedGoals.listGoals.mockRejectedValueOnce(new NetworkError());
    renderFlow();
    expect(await screen.findByText('Connection interrupted')).toBeInTheDocument();

    mockedGoals.listGoals.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('What brings you to Aureus today?')).toBeInTheDocument();
  });

  it('B8: forceNewMission proceeds to the guided flow even if the goals load failed, since it does not need that answer', async () => {
    mockedGoals.listGoals.mockRejectedValueOnce(new NetworkError());

    renderFlow(true);

    expect(await screen.findByText('What brings you to Aureus today?')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('B9 (Gate B outcome sign-off): the loading state and the goals-load-failure error state both pass an automated accessibility audit', async () => {
    mockedGoals.listGoals.mockRejectedValueOnce(new NetworkError());
    const { container } = renderFlow();

    expect(screen.getByText('Preparing your welcome')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    expect(await screen.findByText('Connection interrupted')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
