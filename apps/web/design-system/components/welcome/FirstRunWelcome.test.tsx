import { render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { JourneyProvider } from '../../../state/journey/JourneyContext';
import { OpportunitiesProvider } from '../../../state/opportunities/OpportunitiesContext';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { ThemeProvider } from '../../theme';
import { FirstRunWelcome } from './FirstRunWelcome';
import * as goalsApi from '../../../lib/api/goals';
import * as journeysApi from '../../../lib/api/journeys';
import * as milestonesApi from '../../../lib/api/milestones';
import * as tasksApi from '../../../lib/api/tasks';
import * as opportunitiesApi from '../../../lib/api/opportunities';
import * as savedApi from '../../../lib/api/saved-opportunities';
import * as recommendationsApi from '../../../lib/api/recommendations';
import * as consentApi from '../../../lib/api/consent';
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

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;
const mockedJourneys = journeysApi as jest.Mocked<typeof journeysApi>;
const mockedMilestones = milestonesApi as jest.Mocked<typeof milestonesApi>;
const mockedTasks = tasksApi as jest.Mocked<typeof tasksApi>;
const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;
const mockedSaved = savedApi as jest.Mocked<typeof savedApi>;
const mockedRecommendations = recommendationsApi as jest.Mocked<typeof recommendationsApi>;
const mockedConsent = consentApi as jest.Mocked<typeof consentApi>;

const goal = { id: 'goal-1', title: 'Find a better job', status: 'ACTIVE' as const, userId: 'member-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };
const journeyDto = { id: 'journey-1', title: 'Find a better job', status: 'ACTIVE' as const, goalId: 'goal-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };
const milestone = { id: 'milestone-1', title: 'Get started', status: 'PENDING' as const, position: 0, journeyId: 'journey-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };
const task = { id: 'task-1', title: 'Take the first step', status: 'PENDING' as const, priority: 'MEDIUM' as const, position: 0, milestoneId: 'milestone-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };

const opportunity = {
  id: 'opp-1', opportunityRef: 'AUR-OPP-000001', title: 'Career Training Grant', shortDescription: 'A short description.',
  fullDescription: 'Full description.', category: 'EMPLOYMENT' as const, tags: [], provider: 'Department of Labor',
  officialSourceUrl: 'https://example.com', applicationUrl: null, location: null, country: null, state: null,
  eligibilityRules: 'Open to all', benefitType: 'TRAINING' as const, benefitAmount: null, deadline: null,
  status: 'ACTIVE' as const, verificationStatus: 'VERIFIED' as const, rejectionReason: null, confidenceScore: 90,
  freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'DOL', sourceUrl: null,
  sourceType: 'ADMIN_ENTRY' as const, submittedById: 'admin-1', createdById: 'admin-1', lastUpdatedById: 'admin-1',
  createdAt: 'x', updatedAt: 'x', deletedAt: null,
};

const recommendation = {
  id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
  rationale: 'This matches your goal of finding a better job.', status: 'PENDING' as const, decidedAt: null, createdAt: 'x',
};

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  useEffect(() => {
    if (!session.isAuthenticated) {
      setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!session.isAuthenticated) return null;
  return <>{children}</>;
}

function renderFlow() {
  return render(
    <ThemeProvider>
      <SessionProvider>
        <JourneyProvider>
          <OpportunitiesProvider>
            <RecommendationsProvider>
              <SignedInAs>
                <FirstRunWelcome />
              </SignedInAs>
            </RecommendationsProvider>
          </OpportunitiesProvider>
        </JourneyProvider>
      </SessionProvider>
    </ThemeProvider>,
  );
}

describe('FirstRunWelcome — Domain Completion Rule end-to-end', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.documentElement.removeAttribute('data-reduced-motion');
    window.localStorage.clear();
    mockedGoals.createGoal.mockResolvedValue(goal);
    mockedJourneys.createJourney.mockResolvedValue(journeyDto);
    mockedMilestones.createMilestone.mockResolvedValue(milestone);
    mockedTasks.createTask.mockResolvedValue(task);
    mockedOpportunities.listOpportunities.mockResolvedValue({ data: [opportunity], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedOpportunities.getOpportunity.mockResolvedValue(opportunity);
    mockedSaved.saveOpportunity.mockResolvedValue({
      id: 'saved-1', userId: 'member-1', opportunityId: 'opp-1', isFavorite: false, trackingStatus: 'SAVED', notes: null, savedAt: 'x', updatedAt: 'x',
    });
    mockedRecommendations.generateRecommendations.mockResolvedValue([recommendation]);
    mockedRecommendations.approveRecommendation.mockResolvedValue({ ...recommendation, status: 'ACCEPTED', decidedAt: 'x' });
    mockedConsent.grantConsent.mockResolvedValue({
      granted: true, isCurrentVersion: true, version: CURRENT_CONSENT_VERSION, grantedAt: 'x',
    });
  });

  it('takes a member from welcome through to understanding their next step', async () => {
    renderFlow();
    const user = userEvent.setup();

    // 0. Consent and expectations are captured before arrival proceeds (B3).
    expect(screen.getByText('Before we begin')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));
    await waitFor(() =>
      expect(mockedConsent.grantConsent).toHaveBeenCalledWith('token-123', 'member-1', CURRENT_CONSENT_VERSION),
    );

    // 0.5. Accessibility/communication preferences are captured (B4).
    await waitFor(() => expect(screen.getByText('Make this comfortable for you')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // 1. Welcomed.
    await waitFor(() => expect(screen.getByText('Welcome to Aureus')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Get started' }));

    // 2. Communicates immediate need.
    expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'Find a better job');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // 3. Aureus identifies a meaningful first mission.
    await waitFor(() => expect(screen.getByText('Your first mission is set')).toBeInTheDocument());
    expect(mockedGoals.createGoal).toHaveBeenCalledWith('token-123', 'Find a better job');
    expect(mockedJourneys.createJourney).toHaveBeenCalledWith('token-123', 'goal-1', 'Find a better job');
    expect(mockedMilestones.createMilestone).toHaveBeenCalledWith('token-123', 'journey-1', 'Get started', 0);
    expect(mockedTasks.createTask).toHaveBeenCalledWith('token-123', 'milestone-1', 'Take the first step');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // 4. Relevant opportunities are surfaced.
    await waitFor(() => expect(screen.getByText('Career Training Grant')).toBeInTheDocument());
    expect(mockedOpportunities.listOpportunities).toHaveBeenCalledWith('token-123', { q: 'Find a better job' });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockedSaved.saveOpportunity).toHaveBeenCalledWith('token-123', 'member-1', 'opp-1');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // 5. Aureus prepares recommended actions; the member reviews and approves.
    await waitFor(() => expect(screen.getByText('Aureus prepared a few recommendations')).toBeInTheDocument());
    expect(mockedRecommendations.generateRecommendations).toHaveBeenCalledWith('token-123', 'OPPORTUNITY');
    await waitFor(() => expect(screen.getByText('This matches your goal of finding a better job.')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Career Training Grant')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(mockedRecommendations.approveRecommendation).toHaveBeenCalledWith('token-123', 'rec-1'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // 6. The member leaves understanding their next meaningful step.
    await waitFor(() => expect(screen.getByText("You're ready to begin")).toBeInTheDocument());
    expect(screen.getByText('Take the first step')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View my journey' })).toHaveAttribute('href', '/journey');
    expect(screen.getByRole('link', { name: 'Browse opportunities' })).toHaveAttribute('href', '/opportunities');
    expect(screen.getByRole('link', { name: 'Talk to my steward' })).toHaveAttribute('href', '/conversation');
  });

  it('B9 (Gate B outcome sign-off): every real step of the arrival-to-handoff flow passes an automated accessibility audit (screen-reader condition)', async () => {
    const { container } = renderFlow();
    const user = userEvent.setup();

    expect(screen.getByText('Before we begin')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));

    await waitFor(() => expect(screen.getByText('Make this comfortable for you')).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText('Welcome to Aureus')).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Get started' }));

    expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'Find a better job');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText('Your first mission is set')).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText('Career Training Grant')).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText('Aureus prepared a few recommendations')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Career Training Grant')).toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // The hand-off: a real, working link to the conversational "How can we
    // help?" entry point (Gate C's C1) — not merely a static screen.
    await waitFor(() => expect(screen.getByText("You're ready to begin")).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Talk to my steward' })).toHaveAttribute('href', '/conversation');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('B9: the arrival flow is fully operable by keyboard alone (no mouse dependency) — the low-digital-confidence condition', async () => {
    renderFlow();
    const user = userEvent.setup();

    expect(screen.getByText('Before we begin')).toBeInTheDocument();
    const consentButton = screen.getByRole('button', { name: 'I understand — continue' });
    consentButton.focus();
    expect(consentButton).toHaveFocus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByText('Make this comfortable for you')).toBeInTheDocument());
    await user.tab(); // the "reduce motion" checkbox
    await user.tab(); // the Continue button
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByText('Welcome to Aureus')).toBeInTheDocument());
  });

  it('lets a member continue past Review & Approval without deciding every recommendation', async () => {
    renderFlow();
    const user = userEvent.setup();

    expect(screen.getByText('Before we begin')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));
    await waitFor(() => expect(screen.getByText('Make this comfortable for you')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText('Welcome to Aureus')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Get started' }));
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'Find housing');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText('Your first mission is set')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText('Career Training Grant')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText('Aureus prepared a few recommendations')).toBeInTheDocument());

    // No approve/dismiss click — the member simply continues at their own pace.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText("You're ready to begin")).toBeInTheDocument());
  });

  it('B3: shows an honest, retryable error if granting consent fails, and recovers on retry', async () => {
    mockedConsent.grantConsent.mockRejectedValueOnce(new (jest.requireActual('../../../lib/api/errors').NetworkError)());
    renderFlow();
    const user = userEvent.setup();

    expect(screen.getByText('Before we begin')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));

    await waitFor(() => expect(screen.getByText('Connection interrupted')).toBeInTheDocument());
    expect(screen.queryByText('Welcome to Aureus')).not.toBeInTheDocument();

    mockedConsent.grantConsent.mockResolvedValueOnce({
      granted: true, isCurrentVersion: true, version: CURRENT_CONSENT_VERSION, grantedAt: 'x',
    });
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('Make this comfortable for you')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText('Welcome to Aureus')).toBeInTheDocument());
    expect(mockedConsent.grantConsent).toHaveBeenCalledTimes(2);
  });

  it('B4: setting "reduce motion" during arrival measurably applies it — not merely stored', async () => {
    renderFlow();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));
    await waitFor(() => expect(screen.getByText('Make this comfortable for you')).toBeInTheDocument());

    expect(document.documentElement.getAttribute('data-reduced-motion')).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: 'Reduce motion and animation' }));
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText('Welcome to Aureus')).toBeInTheDocument());
    // The applied preference persists past the step that set it.
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true');
  });

  it('B6: a reload mid-arrival resumes at the persisted step instead of restarting at consent', async () => {
    window.localStorage.setItem('aureus.arrival.step', 'hospitality');

    renderFlow();

    await waitFor(() => expect(screen.getByText('Welcome to Aureus')).toBeInTheDocument());
    expect(screen.queryByText('Before we begin')).not.toBeInTheDocument();
    expect(screen.queryByText('Make this comfortable for you')).not.toBeInTheDocument();
    expect(mockedConsent.grantConsent).not.toHaveBeenCalled();
  });

  it('B6: reaching the final step clears the persisted position — nothing left to resume', async () => {
    window.localStorage.setItem('aureus.arrival.step', 'review-approval');
    mockedRecommendations.generateRecommendations.mockResolvedValue([recommendation]);

    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Aureus prepared a few recommendations')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText("You're ready to begin")).toBeInTheDocument());
    expect(window.localStorage.getItem('aureus.arrival.step')).toBeNull();
  });

  it('B6: resuming at first-mission with no created goal falls back to immediate-need rather than getting stuck', async () => {
    window.localStorage.setItem('aureus.arrival.step', 'first-mission');

    renderFlow();

    // No blank screen, no dead end — the member can simply state their need again.
    await waitFor(() => expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument());
  });

  it('B8: a failed opportunity search shows an honest, retryable error and a Continue path — never a dead end', async () => {
    window.localStorage.setItem('aureus.arrival.step', 'opportunities');
    mockedOpportunities.listOpportunities.mockRejectedValueOnce(new NetworkError());

    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Connection interrupted')).toBeInTheDocument());
    // Not stuck: Continue remains available even while the search failed.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();

    mockedOpportunities.listOpportunities.mockResolvedValueOnce({ data: [opportunity], total: 1, page: 1, limit: 20, totalPages: 1 });
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('Career Training Grant')).toBeInTheDocument());
  });

  it('B8: a failed recommendation generation shows an honest, retryable error and recovers on retry', async () => {
    window.localStorage.setItem('aureus.arrival.step', 'review-approval');
    mockedRecommendations.generateRecommendations.mockRejectedValueOnce(new NetworkError());

    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Connection interrupted')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();

    mockedRecommendations.generateRecommendations.mockResolvedValueOnce([recommendation]);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('This matches your goal of finding a better job.')).toBeInTheDocument());
  });
});
