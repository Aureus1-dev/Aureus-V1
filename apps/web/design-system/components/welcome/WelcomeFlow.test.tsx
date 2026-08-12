import { useEffect } from 'react';
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
const router = { replace };
jest.mock('next/navigation', () => ({ useRouter: () => router }));

const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;

const activeGoal = {
  id: 'goal-1',
  title: 'Find a better job',
  status: 'ACTIVE' as const,
  userId: 'member-1',
  createdAt: 'x',
  updatedAt: 'x',
  deletedAt: null,
};

function TestHarness({ forceNewMission }: { forceNewMission?: boolean }) {
  const { setSession, session } = useSession();
  useEffect(() => {
    if (!session.isAuthenticated) {
      setSession({
        ...session,
        isAuthenticated: true,
        accessToken: 'token-123',
        memberId: 'member-1',
      });
    }
  }, [session, setSession]);

  if (!session.isAuthenticated) return null;
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

describe('WelcomeFlow compatibility route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('sends a returning member with goals to Home', async () => {
    mockedGoals.listGoals.mockResolvedValue({
      data: [activeGoal],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderFlow();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
    expect(screen.queryByText('What brings you to Aureus today?')).not.toBeInTheDocument();
  });

  it('sends a first-time member to the conversational Hall instead of the old form', async () => {
    mockedGoals.listGoals.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    renderFlow();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/conversation'));
    expect(screen.queryByText('What brings you to Aureus today?')).not.toBeInTheDocument();
  });

  it('opens a deliberate new mission as a fresh conversation without loading old goals', async () => {
    renderFlow(true);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/conversation'));
    expect(mockedGoals.listGoals).not.toHaveBeenCalled();
  });

  it('does not resume an incomplete legacy form over a member who already has a goal', async () => {
    mockedGoals.listGoals.mockResolvedValue({
      data: [activeGoal],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    window.localStorage.setItem('aureus.arrival.step', 'stewardship-offer');

    renderFlow();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
    expect(
      screen.queryByRole('heading', { name: 'What Aureus does, and what stays yours' }),
    ).not.toBeInTheDocument();
  });

  it('shows an honest, retryable error when goal loading fails', async () => {
    mockedGoals.listGoals.mockRejectedValueOnce(new NetworkError());

    renderFlow();

    expect(await screen.findByText('Connection interrupted')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('routes into conversation after a successful retry for a first-time member', async () => {
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

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/conversation'));
  });

  it('keeps the loading and goal-load-failure states accessible', async () => {
    mockedGoals.listGoals.mockRejectedValueOnce(new NetworkError());
    const { container } = renderFlow();

    expect(screen.getByText('Preparing your welcome')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    expect(await screen.findByText('Connection interrupted')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
