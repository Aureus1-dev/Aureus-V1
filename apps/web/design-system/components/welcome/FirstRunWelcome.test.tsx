import { render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { JourneyProvider } from '../../../state/journey/JourneyContext';
import { OpportunitiesProvider } from '../../../state/opportunities/OpportunitiesContext';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { PlanProvider } from '../../../state/plan/PlanContext';
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
import * as conversationsApi from '../../../lib/api/conversations';
import * as needsApi from '../../../lib/api/needs';
import * as planApi from '../../../lib/api/plan';
import { CURRENT_CONSENT_VERSION } from '../../../lib/config/consent';
import { MEMBER_ARRIVAL_FLAGS } from '../../../lib/config/member-arrival-flags';
import { CLARIFYING_QUESTION, OUTCOME_QUESTION } from './understanding-progress';
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
jest.mock('../../../lib/api/needs');
jest.mock('../../../lib/api/plan');

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
const mockedConversations = conversationsApi as jest.Mocked<typeof conversationsApi>;
const mockedNeeds = needsApi as jest.Mocked<typeof needsApi>;
const mockedPlan = planApi as jest.Mocked<typeof planApi>;

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

function SignedInAs({ children, asGuest = false }: { children: React.ReactNode; asGuest?: boolean }) {
  const { setSession, session } = useSession();
  useEffect(() => {
    if (!session.isAuthenticated) {
      setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1', isGuest: asGuest });
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
              <ConversationProvider>
                <PlanProvider>
                  <SignedInAs>
                    <FirstRunWelcome />
                  </SignedInAs>
                </PlanProvider>
              </ConversationProvider>
            </RecommendationsProvider>
          </OpportunitiesProvider>
        </JourneyProvider>
      </SessionProvider>
    </ThemeProvider>,
  );
}

function renderFlowAsGuest() {
  return render(
    <ThemeProvider>
      <SessionProvider>
        <JourneyProvider>
          <OpportunitiesProvider>
            <RecommendationsProvider>
              <ConversationProvider>
                <PlanProvider>
                  <SignedInAs asGuest>
                    <FirstRunWelcome />
                  </SignedInAs>
                </PlanProvider>
              </ConversationProvider>
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

describe('FirstRunWelcome — Member Arrival: need understanding via ConversationsService.ask() (flag-gated)', () => {
  const conversation = { id: 'conv-1', userId: 'member-1', title: null, createdAt: 'x', updatedAt: 'x' };

  const assistantMessage = (content: string, id = `assistant-${Math.random()}`) => ({
    id, conversationId: 'conv-1', role: 'ASSISTANT' as const, content, createdAt: 'x',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    MEMBER_ARRIVAL_FLAGS.stewardExperience = true;
    window.localStorage.setItem('aureus.arrival.step', 'immediate-need');
    mockedConversations.createConversation.mockResolvedValue(conversation);
    mockedGoals.createGoal.mockResolvedValue(goal);
    mockedJourneys.createJourney.mockResolvedValue(journeyDto);
    mockedMilestones.createMilestone.mockResolvedValue(milestone);
    mockedTasks.createTask.mockResolvedValue(task);
    mockedConsent.grantConsent.mockResolvedValue({
      granted: true, isCurrentVersion: true, version: CURRENT_CONSENT_VERSION, grantedAt: 'x',
    });
  });

  afterEach(() => {
    MEMBER_ARRIVAL_FLAGS.stewardExperience = false;
  });

  it('routes the first stated need through ask(), and reflects an already-clear outcome back instead of asking again', async () => {
    mockedConversations.sendMessage.mockResolvedValueOnce(
      assistantMessage('It sounds like finding a better job is what would help most right now.'),
    );
    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'Find a better job');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(mockedConversations.sendMessage).toHaveBeenCalledWith('token-123', 'conv-1', 'Find a better job', undefined));
    await waitFor(() => expect(screen.getByText("Here's what we understood")).toBeInTheDocument());
    expect(screen.getByText('It sounds like finding a better job is what would help most right now.')).toBeInTheDocument();
    expect(mockedGoals.createGoal).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: "That's right — continue" }));

    // Consent Resequencing: confirming what Aureus understood does not
    // itself create the mission — full consent is required first,
    // immediately before this flow's first persistent write.
    await waitFor(() => expect(screen.getByText('Before we begin')).toBeInTheDocument());
    expect(mockedGoals.createGoal).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));

    await waitFor(() => expect(mockedGoals.createGoal).toHaveBeenCalledWith('token-123', 'Find a better job'));
    await waitFor(() => expect(screen.getByText('Your first mission is set')).toBeInTheDocument());
  });

  it('asks the single outcome question when the desired result is not already clear, then proceeds once answered', async () => {
    mockedConversations.sendMessage
      .mockResolvedValueOnce(assistantMessage(OUTCOME_QUESTION))
      .mockResolvedValueOnce(assistantMessage('Got it — staying housed is what matters most.'));
    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'My landlord gave me an eviction notice');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText('What would help most right now?')).toBeInTheDocument());
    await user.type(screen.getByLabelText('What would help most', { exact: false }), 'I want to stay in my apartment');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(mockedConversations.sendMessage).toHaveBeenLastCalledWith(
        'token-123', 'conv-1', 'I want to stay in my apartment', undefined,
      ),
    );
    await waitFor(() => expect(screen.getByText("Here's what we understood")).toBeInTheDocument());
    expect(screen.getByText('Got it — staying housed is what matters most.')).toBeInTheDocument();
  });

  it('asks a clarifying question for an ambiguous first message, and never skips it to the outcome question', async () => {
    mockedConversations.sendMessage
      .mockResolvedValueOnce(assistantMessage(CLARIFYING_QUESTION))
      .mockResolvedValueOnce(assistantMessage('Got it — housing help in Chester County.'));
    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'help');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText(CLARIFYING_QUESTION)).toBeInTheDocument());
    expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument();
    await user.type(
      screen.getByLabelText('Your immediate need', { exact: false }),
      'I need help finding affordable housing in Chester County',
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText("Here's what we understood")).toBeInTheDocument());
  });

  it('shows real crisis resources instead of proceeding to a plan, and never auto-continues past it', async () => {
    const crisisMessage = "If you're thinking about suicide or self-harm, call or text 988. I'm still here if you want to talk once you're safe.";
    mockedConversations.sendMessage.mockResolvedValueOnce(assistantMessage(crisisMessage));
    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'I want to end it all');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText(crisisMessage)).toBeInTheDocument());
    expect(screen.queryByText("Here's what we understood")).not.toBeInTheDocument();
    expect(mockedGoals.createGoal).not.toHaveBeenCalled();
    // The member can still keep talking — this is not a dead end.
    expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument();
  });

  it('lets the member correct a wrong reflection, still gated on consent before the mission is created, without a second AI round trip', async () => {
    mockedConversations.sendMessage.mockResolvedValueOnce(assistantMessage('It sounds like a new job is what matters most.'));
    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'I need a new job');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText("Here's what we understood")).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Not quite' }));
    await user.type(screen.getByLabelText('What would help most', { exact: false }), 'Actually I need childcare first');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText('Before we begin')).toBeInTheDocument());
    expect(mockedGoals.createGoal).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));

    await waitFor(() => expect(mockedGoals.createGoal).toHaveBeenCalledWith('token-123', 'Actually I need childcare first'));
    expect(mockedConversations.sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe('FirstRunWelcome — Member Arrival: the Coordinated Plan replaces discovery + review (flag-gated)', () => {
  const planRecommendation = {
    id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
    rationale: 'This matches your goal of finding a better job.', status: 'PENDING' as const, decidedAt: null, createdAt: 'x',
  };
  const planRun = {
    id: 'run-1', userId: 'member-1', goal: 'COORDINATED_PLAN' as const, capabilitiesInvoked: ['RECOMMENDATION'],
    outcome: 'Built a coordinated plan.', status: 'SUCCESS' as const, latencyMs: 10, createdAt: 'x',
  };
  const cityResource = {
    id: 'city-1', citySheetRef: 'AUR-CS-000001', organizationName: 'Chester County Food Bank',
    category: 'FOOD_RESOURCE' as const, description: 'Free groceries weekly.', address: null, serviceArea: 'Chester County',
    phone: null, website: null, hours: 'Mon-Fri 9am-5pm', eligibilityRequirements: null, languagesSupported: [],
    accessibilityNotes: null, cost: null, requiredDocuments: [], referralRequired: false, isEmergencyService: false,
    verificationStatus: 'VERIFIED' as const, isTestFixture: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MEMBER_ARRIVAL_FLAGS.stewardExperience = true;
    mockedGoals.createGoal.mockResolvedValue(goal);
    mockedJourneys.createJourney.mockResolvedValue(journeyDto);
    mockedMilestones.createMilestone.mockResolvedValue(milestone);
    mockedTasks.createTask.mockResolvedValue(task);
    mockedConsent.grantConsent.mockResolvedValue({
      granted: true, isCurrentVersion: true, version: CURRENT_CONSENT_VERSION, grantedAt: 'x',
    });
  });

  afterEach(() => {
    MEMBER_ARRIVAL_FLAGS.stewardExperience = false;
  });

  it('replaces Opportunity Discovery and Review & Approval with one coordinated plan once the first mission is set', async () => {
    window.localStorage.setItem('aureus.arrival.step', 'coordinated-plan');
    mockedPlan.buildCoordinatedPlan.mockResolvedValue({
      run: planRun,
      plan: {
        primary: { source: 'RECOMMENDATION', recommendation: planRecommendation, cityResource: null, categoryLabel: 'Opportunity' },
        supporting: [],
        combinedRationale: 'Opportunity is the strongest real option available right now.',
        additionalPossibilitiesCount: 0,
      },
    });

    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(mockedPlan.buildCoordinatedPlan).toHaveBeenCalledWith('token-123', undefined));
    await waitFor(() => expect(screen.getByText("Here's what Aureus put together")).toBeInTheDocument());
    expect(screen.queryByText('Opportunities that might help')).not.toBeInTheDocument();
    expect(screen.getByText('This matches your goal of finding a better job.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(mockedRecommendations.approveRecommendation).toHaveBeenCalledWith('token-123', 'rec-1'));

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // The Stewardship Offer — a decision about preserving progress across
    // sessions and devices, separate from the persistence consent already
    // granted earlier in this flow.
    await waitFor(() => expect(screen.getByText('What Aureus does, and what stays yours')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // Execution status narration + a long-term stewardship prompt
    // (Founder ruling) closes the flow instead of the legacy "anything
    // else?" NextStepSummary — narrating the approved item honestly.
    await waitFor(() => expect(screen.getByText("Here's where things stand")).toBeInTheDocument());
    expect(screen.queryByText("You're ready to begin")).not.toBeInTheDocument();
    expect(screen.getByText(/noted on your Journey/)).toBeInTheDocument();
  });

  it("the first mission's Continue leads to the coordinated plan, not the legacy discovery step", async () => {
    window.localStorage.setItem('aureus.arrival.step', 'immediate-need');
    mockedConversations.createConversation.mockResolvedValue({ id: 'conv-1', userId: 'member-1', title: null, createdAt: 'x', updatedAt: 'x' });
    mockedConversations.sendMessage.mockResolvedValueOnce({
      id: 'assistant-1', conversationId: 'conv-1', role: 'ASSISTANT', content: 'Got it — a better job.', createdAt: 'x',
    });
    mockedPlan.buildCoordinatedPlan.mockResolvedValue({ run: { ...planRun, status: 'NO_ACTION' } });

    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'Find a better job');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText("Here's what we understood")).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: "That's right — continue" }));
    await waitFor(() => expect(screen.getByText('Before we begin')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));
    await waitFor(() => expect(screen.getByText('Your first mission is set')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(mockedPlan.buildCoordinatedPlan).toHaveBeenCalled());
    expect(screen.queryByText('Opportunities that might help')).not.toBeInTheDocument();
  });

  it('offers a verified City Sheet resource automatically, and records the member\'s accept through the same Gate C mechanism', async () => {
    // The conversation (and its captured StatedNeed) is always established
    // during the understanding step, strictly before the coordinated plan
    // is ever built — this drives the whole realistic path rather than
    // short-circuiting straight to 'coordinated-plan', since a plan that
    // leads with a City Sheet match only ever exists once a needId is
    // already known.
    window.localStorage.setItem('aureus.arrival.step', 'immediate-need');
    mockedConversations.createConversation.mockResolvedValue({ id: 'conv-1', userId: 'member-1', title: null, createdAt: 'x', updatedAt: 'x' });
    mockedConversations.sendMessage.mockResolvedValueOnce({
      id: 'assistant-1', conversationId: 'conv-1', role: 'ASSISTANT', content: 'Got it — food assistance.', createdAt: 'x',
    });
    mockedNeeds.getMyNeeds.mockResolvedValue([{ id: 'need-1', conversationId: 'conv-1', content: 'I need food', createdAt: 'x' }]);
    mockedNeeds.offerResource.mockResolvedValue({
      id: 'offer-1', statedNeedId: 'need-1', citySheetEntryId: 'city-1', response: 'PENDING', offeredAt: 'x', respondedAt: null,
    });
    mockedNeeds.respondToOffer.mockResolvedValue({
      id: 'offer-1', statedNeedId: 'need-1', citySheetEntryId: 'city-1', response: 'ACCEPTED', offeredAt: 'x', respondedAt: 'x',
    });
    mockedPlan.buildCoordinatedPlan.mockResolvedValue({
      run: planRun,
      plan: {
        primary: { source: 'CITY_RESOURCE', recommendation: null, cityResource, categoryLabel: 'Verified local resource' },
        supporting: [],
        combinedRationale: 'A verified local resource is the strongest option right now.',
        additionalPossibilitiesCount: 0,
      },
    });

    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'I need food for my family');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText("Here's what we understood")).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: "That's right — continue" }));
    await waitFor(() => expect(screen.getByText('Before we begin')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));
    await waitFor(() => expect(screen.getByText('Your first mission is set')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(mockedPlan.buildCoordinatedPlan).toHaveBeenCalledWith('token-123', 'need-1'));
    await waitFor(() => expect(mockedNeeds.offerResource).toHaveBeenCalledWith('token-123', 'need-1', 'city-1'));
    await waitFor(() => expect(screen.getByText('Chester County Food Bank')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(mockedNeeds.respondToOffer).toHaveBeenCalledWith('token-123', 'need-1', 'city-1', true));
    await waitFor(() => expect(screen.getByText('You accepted this resource.')).toBeInTheDocument());
  });

  it('recovers from a failed plan build with a retry', async () => {
    window.localStorage.setItem('aureus.arrival.step', 'coordinated-plan');
    mockedPlan.buildCoordinatedPlan.mockRejectedValueOnce(new NetworkError());

    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Connection interrupted')).toBeInTheDocument());

    mockedPlan.buildCoordinatedPlan.mockResolvedValueOnce({
      run: planRun,
      plan: {
        primary: { source: 'RECOMMENDATION', recommendation: planRecommendation, cityResource: null, categoryLabel: 'Opportunity' },
        supporting: [],
        combinedRationale: 'Opportunity is the strongest real option available right now.',
        additionalPossibilitiesCount: 0,
      },
    });
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText("Here's what Aureus put together")).toBeInTheDocument());
  });
});

describe('FirstRunWelcome — Member Arrival: Consent Resequencing (flag-gated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    MEMBER_ARRIVAL_FLAGS.stewardExperience = true;
    mockedGoals.createGoal.mockResolvedValue(goal);
    mockedJourneys.createJourney.mockResolvedValue(journeyDto);
    mockedMilestones.createMilestone.mockResolvedValue(milestone);
    mockedTasks.createTask.mockResolvedValue(task);
    mockedConsent.grantConsent.mockResolvedValue({
      granted: true, isCurrentVersion: true, version: CURRENT_CONSENT_VERSION, grantedAt: 'x',
    });
    mockedConversations.createConversation.mockResolvedValue({ id: 'conv-1', userId: 'member-1', title: null, createdAt: 'x', updatedAt: 'x' });
    mockedPlan.buildCoordinatedPlan.mockResolvedValue({
      run: {
        id: 'run-1', userId: 'member-1', goal: 'COORDINATED_PLAN' as const, capabilitiesInvoked: [],
        outcome: 'no candidate action was available right now.', status: 'NO_ACTION' as const, latencyMs: 5, createdAt: 'x',
      },
    });
  });

  afterEach(() => {
    MEMBER_ARRIVAL_FLAGS.stewardExperience = false;
  });

  it('never shows a full consent wall before help — the member reaches the first message immediately', async () => {
    renderFlow();

    // No "Before we begin" consent gate anywhere before the member has
    // said what brings them here.
    expect(screen.queryByText('Before we begin')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Make this comfortable for you')).toBeInTheDocument());
  });

  it('shows a brief, calm privacy notice before the first message — never a blocking wall', async () => {
    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Make this comfortable for you')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText('Welcome to Aureus')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Get started' }));

    await waitFor(() => expect(screen.getByText('What brings you to Aureus today?')).toBeInTheDocument());
    expect(screen.getByText(/Aureus uses what you share here to understand how to help/)).toBeInTheDocument();
    // Not a wall: the field is immediately usable, no consent action required first.
    expect(screen.getByLabelText('Your immediate need', { exact: false })).toBeEnabled();
  });

  it('never invokes createFirstMission() or any other persistent write until consent is granted', async () => {
    mockedConversations.sendMessage.mockResolvedValueOnce({
      id: 'assistant-1', conversationId: 'conv-1', role: 'ASSISTANT', content: 'Got it — a better job.', createdAt: 'x',
    });
    renderFlow();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Make this comfortable for you')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText('Welcome to Aureus')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Get started' }));
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'Find a better job');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByText("Here's what we understood")).toBeInTheDocument());
    expect(mockedGoals.createGoal).not.toHaveBeenCalled();
    expect(mockedJourneys.createJourney).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: "That's right — continue" }));
    await waitFor(() => expect(screen.getByText('Before we begin')).toBeInTheDocument());
    expect(mockedGoals.createGoal).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));
    await waitFor(() => expect(mockedGoals.createGoal).toHaveBeenCalledWith('token-123', 'Find a better job'));
  });

  it('treats persistence consent and account creation as two separate decisions for a guest', async () => {
    mockedConversations.sendMessage.mockResolvedValueOnce({
      id: 'assistant-1', conversationId: 'conv-1', role: 'ASSISTANT', content: 'Got it — a better job.', createdAt: 'x',
    });
    renderFlowAsGuest();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Make this comfortable for you')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText('Welcome to Aureus')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Get started' }));
    await user.type(screen.getByLabelText('Your immediate need', { exact: false }), 'Find a better job');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText("Here's what we understood")).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: "That's right — continue" }));

    // Decision 1: persistence consent — mentions nothing about accounts.
    await waitFor(() => expect(screen.getByText('Before we begin')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: 'Create free account' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'I understand — continue' }));

    await waitFor(() => expect(screen.getByText('Your first mission is set')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(mockedPlan.buildCoordinatedPlan).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // Decision 2: account creation — a separate step, reached only after
    // persistence consent already happened, never bundled with it.
    await waitFor(() => expect(screen.getByRole('link', { name: 'Create free account' })).toBeInTheDocument());
    expect(screen.getByText(/only preserves your progress/)).toBeInTheDocument();
  });
});
