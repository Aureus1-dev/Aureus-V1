import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { JourneyProvider } from '../../../state/journey/JourneyContext';
import { OpportunitiesProvider } from '../../../state/opportunities/OpportunitiesContext';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { ThemeProvider } from '../../theme';
import { WelcomeFlow } from './WelcomeFlow';
import * as goalsApi from '../../../lib/api/goals';

jest.mock('../../../lib/api/goals');
jest.mock('../../../lib/api/journeys');
jest.mock('../../../lib/api/milestones');
jest.mock('../../../lib/api/tasks');
jest.mock('../../../lib/api/opportunities');
jest.mock('../../../lib/api/saved-opportunities');
jest.mock('../../../lib/api/recommendations');

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;

const activeGoal = { id: 'goal-1', title: 'Find a better job', status: 'ACTIVE' as const, userId: 'member-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };

function TestHarness({ forceNewMission }: { forceNewMission?: boolean }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
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
              <TestHarness forceNewMission={forceNewMission} />
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
    mockedGoals.listGoals.mockResolvedValue({ data: [activeGoal], total: 1, page: 1, limit: 20, totalPages: 1 });

    renderFlow();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
    expect(screen.queryByText('Welcome to Aureus')).not.toBeInTheDocument();
  });

  it('shows the guided first-run flow for a genuine first-run member (no goals yet), starting with consent (B3)', async () => {
    mockedGoals.listGoals.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    renderFlow();

    expect(await screen.findByText('Before we begin')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('forceNewMission (from ?newMission=true) bypasses the Home redirect for a returning member and skips hospitality', async () => {
    mockedGoals.listGoals.mockResolvedValue({ data: [activeGoal], total: 1, page: 1, limit: 20, totalPages: 1 });

    renderFlow(true);

    expect(await screen.findByText('What brings you to Aureus today?')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText('Welcome to Aureus')).not.toBeInTheDocument();
  });

  it('B2: a repeat visit returns within three seconds — the redirect fires as soon as goals resolve, with no artificial delay in the path', async () => {
    mockedGoals.listGoals.mockResolvedValue({ data: [activeGoal], total: 1, page: 1, limit: 20, totalPages: 1 });

    const startedAt = performance.now();
    renderFlow();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(3000);
  });

  it('B6: a member with a goal but an incomplete guided flow is resumed, not redirected to Home', async () => {
    mockedGoals.listGoals.mockResolvedValue({ data: [activeGoal], total: 1, page: 1, limit: 20, totalPages: 1 });
    window.localStorage.setItem('aureus.arrival.step', 'opportunities');

    renderFlow();

    expect(await screen.findByRole('heading', { name: 'Opportunities that might help' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
