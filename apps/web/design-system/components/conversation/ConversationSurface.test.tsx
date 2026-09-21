import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { VoiceProvider } from '../../../state/voice/VoiceContext';
import { JourneyProvider } from '../../../state/journey/JourneyContext';
import { PlanProvider } from '../../../state/plan/PlanContext';
import { usePlan } from '../../../state';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { ConnectedExperiencesProvider } from '../../../state/connected-experiences/ConnectedExperiencesContext';
import { ConversationSurface } from './ConversationSurface';
import * as conversationsApi from '../../../lib/api/conversations';
import * as voiceApi from '../../../lib/api/voice';
import * as goalsApi from '../../../lib/api/goals';
import * as planApi from '../../../lib/api/plan';
import * as needsApi from '../../../lib/api/needs';
import * as documentsApi from '../../../lib/api/documents';
import * as recommendationsApi from '../../../lib/api/recommendations';
import * as opportunitiesApi from '../../../lib/api/opportunities';
import * as peopleHelpApi from '../../../lib/api/people-help';
import { ApiError } from '../../../lib/api/errors';

jest.mock('../../../lib/api/conversations');
jest.mock('../../../lib/api/voice');
jest.mock('../../../lib/voice/webrtc-client');
jest.mock('../../../lib/api/goals');
jest.mock('../../../lib/api/journeys');
jest.mock('../../../lib/api/milestones');
jest.mock('../../../lib/api/tasks');
jest.mock('../../../lib/api/plan');
jest.mock('../../../lib/api/recommendations');
jest.mock('../../../lib/api/needs');
jest.mock('../../../lib/api/documents');
jest.mock('../../../lib/api/connected-accounts');
jest.mock('../../../lib/api/steward-activity');
jest.mock('../../../lib/api/opportunities');
jest.mock('../../../lib/api/people-help');
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockedApi = conversationsApi as jest.Mocked<typeof conversationsApi>;
const mockedVoiceApi = voiceApi as jest.Mocked<typeof voiceApi>;
const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;
const mockedPlan = planApi as jest.Mocked<typeof planApi>;
const mockedNeeds = needsApi as jest.Mocked<typeof needsApi>;
const mockedDocuments = documentsApi as jest.Mocked<typeof documentsApi>;
const mockedRecommendations = recommendationsApi as jest.Mocked<typeof recommendationsApi>;
const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;
const mockedPeopleHelp = peopleHelpApi as jest.Mocked<typeof peopleHelpApi>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  const signedIn = session.isAuthenticated;
  if (!signedIn) {
    setSession({
      ...session,
      isAuthenticated: true,
      accessToken: 'token-123',
      memberId: 'member-1',
    });
  }
  return <>{children}</>;
}

function renderSurface({ signedIn = true }: { signedIn?: boolean } = {}) {
  return render(
    <SessionProvider>
      <ConversationProvider>
        <VoiceProvider>
          <JourneyProvider>
            <PlanProvider>
              <RecommendationsProvider>
                <ConnectedExperiencesProvider>
                  {signedIn ? (
                    <SignedInAs>
                      <ConversationSurface />
                    </SignedInAs>
                  ) : (
                    <ConversationSurface />
                  )}
                </ConnectedExperiencesProvider>
              </RecommendationsProvider>
            </PlanProvider>
          </JourneyProvider>
        </VoiceProvider>
      </ConversationProvider>
    </SessionProvider>,
  );
}

function makeResponsibility(
  overrides: Partial<peopleHelpApi.PeopleResponsibilityDto> = {},
): peopleHelpApi.PeopleResponsibilityDto {
  return {
    id: 'responsibility-1',
    kind: 'OPPORTUNITY_APPLICATION_GUIDANCE',
    objective: 'Help me work through the verified application for Career Training Grant',
    status: 'ACTIVE',
    contextType: 'PERSONAL',
    authorityClass: 'GUIDANCE_ONLY',
    authorityPolicyVersion: 'responsibility-guidance-v1',
    privacyScope: 'PERSONAL_PRIVATE',
    privacyPolicyVersion: 'personal-private-v1',
    originConversationId: 'conv-1',
    originOpportunityId: 'opportunity-1',
    successCriteria: { type: 'APPLICATION_GUIDANCE_MEMBER_OUTCOME_RECORDED' },
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: null,
    createdAt: '2026-09-01T20:00:00.000Z',
    updatedAt: '2026-09-01T20:00:00.000Z',
    events: [],
    ...overrides,
  };
}

describe('ConversationSurface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listConversations.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    mockedGoals.listGoals.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    mockedNeeds.getMyNeeds.mockResolvedValue([]);
    mockedDocuments.listDocuments.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    mockedPeopleHelp.getActivePeopleApplicationHelp.mockResolvedValue({
      session: null,
      responsibility: null,
    });
  });

  it('prompts sign-in when the member is not authenticated, without calling the API', () => {
    renderSurface({ signedIn: false });
    expect(screen.getByText('Sign in to talk with your steward')).toBeInTheDocument();
    expect(mockedApi.listConversations).not.toHaveBeenCalled();
  });

  it('shows an empty state before any message has been sent', async () => {
    renderSurface();
    expect(await screen.findByText('How can we help?')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Aureus will ask before taking action or saving anything as lasting memory/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Talk' })).toBeInTheDocument();
  });

  it('sends a message end-to-end and displays the exchange', async () => {
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    mockedApi.sendMessage.mockResolvedValue({
      id: 'reply-1',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'It sounds like you want to get started.',
      createdAt: 'x',
    });

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Hello, I need help.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    const log = await screen.findByRole('log');
    await waitFor(() =>
      expect(within(log).getByText('Hello, I need help.')).toBeInTheDocument(),
    );
    expect(await screen.findByText('It sounds like you want to get started.')).toBeInTheDocument();
  });

  it('shows one primary prompt with one short supporting line — no duplicate "How can we help?" and no separate front-door promise', async () => {
    renderSurface();
    expect(await screen.findByText('How can we help?')).toBeInTheDocument();
    expect(screen.getByText('Tell me what you want to accomplish.')).toBeInTheDocument();
    // Only one heading-level "How can we help?" — the composer must not
    // restate it as its own placeholder (that duplication is exactly what
    // made the mobile opening screen feel cluttered).
    expect(screen.getAllByText('How can we help?')).toHaveLength(1);
    expect(screen.queryByText(/Aureus figures out how to get it done/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('How can we help?')).not.toBeInTheDocument();
  });

  it('shows the Visible Work summary with real content once a message has been sent, and no "Needs you" absent a real signal', async () => {
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    mockedApi.sendMessage.mockResolvedValue({
      id: 'reply-1',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'It sounds like you want to get started.',
      createdAt: 'x',
    });

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Hello, I need help.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    await screen.findByText('It sounds like you want to get started.');

    const summary = screen.getByRole('region', { name: 'Active work' });
    // Outcome is the dominant heading — the member's own words, directly —
    // not a labeled row like the other fields.
    expect(within(summary).getByRole('heading', { name: 'Hello, I need help.' })).toBeInTheDocument();
    expect(within(summary).getByText('Aureus is carrying')).toBeInTheDocument();
    expect(within(summary).getByText('Done means')).toBeInTheDocument();
    // No opportunity action and no resumable application help were returned,
    // so "Needs you" must not be invented.
    expect(within(summary).queryByText('Needs you')).not.toBeInTheDocument();
  });

  it('reflects the current request in "Working on" after a second, different turn — not the first message', async () => {
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    // `build-virtual-timeline.ts` orders entries by real `createdAt`
    // timestamp (not call order), so replies must carry a real, correctly
    // sequenced timestamp — captured at call time, exactly as the real API
    // would — rather than the literal `'x'` other single-exchange tests in
    // this file use, which only happens to sort correctly for one exchange.
    let replyCount = 0;
    mockedApi.sendMessage.mockImplementation(async () => {
      replyCount += 1;
      return {
        id: `reply-${replyCount}`,
        conversationId: 'conv-1',
        role: 'ASSISTANT',
        content: replyCount === 1 ? 'First reply.' : 'Second reply.',
        createdAt: new Date().toISOString(),
      };
    });

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');

    await userEvent.type(textarea, 'First request about job training.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('First reply.');

    expect(
      within(screen.getByRole('region', { name: 'Active work' })).getByText(
        'First request about job training.',
      ),
    ).toBeInTheDocument();

    await userEvent.type(textarea, 'Actually, I need help with something else entirely.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Second reply.');

    const summary = screen.getByRole('region', { name: 'Active work' });
    expect(
      within(summary).getByText('Actually, I need help with something else entirely.'),
    ).toBeInTheDocument();
    // The first request must not linger as "the current work" once a newer,
    // different request has replaced it.
    expect(within(summary).queryByText('First request about job training.')).not.toBeInTheDocument();
  });

  it('never lets an unrelated member-global ACTIVE Journey goal override the current conversation\'s "Working on"', async () => {
    // GoalDto carries no conversationId — an ACTIVE goal from a completely
    // separate journey must never be substituted for what THIS conversation
    // is currently about.
    mockedGoals.listGoals.mockResolvedValue({
      data: [
        {
          id: 'goal-unrelated',
          title: 'Renovate the kitchen',
          status: 'ACTIVE',
          userId: 'member-1',
          createdAt: 'x',
          updatedAt: 'x',
          deletedAt: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    mockedApi.sendMessage.mockResolvedValue({
      id: 'reply-1',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'Got it.',
      createdAt: 'x',
    });

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Help me find a food pantry nearby.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Got it.');

    const summary = screen.getByRole('region', { name: 'Active work' });
    expect(within(summary).getByText('Help me find a food pantry nearby.')).toBeInTheDocument();
    expect(within(summary).queryByText('Renovate the kitchen')).not.toBeInTheDocument();
  });

  it('does not keep a prior turn\'s opportunity under "Needs you" once a new member turn starts', async () => {
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    const opportunityAction = {
      opportunityId: 'opp-1',
      opportunityRef: 'AUR-OPP-000001',
      title: 'Career Training Grant',
      provider: 'Department of Labor',
      url: 'https://example.com',
      canonicalUrl: 'https://example.com',
      referralUrl: null,
      affiliateDisclosure: null,
      eligibility: 'Open to all',
      geography: null,
      payoutNotes: null,
      timeToCashNotes: null,
      status: 'verified' as const,
      lastVerifiedAt: 'x',
      sourceName: 'DOL',
      sourceUrl: null,
      sourceType: 'ADMIN_ENTRY' as const,
    };
    // Real, call-time timestamps — `build-virtual-timeline.ts` sorts entries
    // by `createdAt`, and the literal `'x'` other single-exchange tests use
    // sorts after any real ISO timestamp, which would silently corrupt
    // ordering the moment a second real-timestamped message exists.
    mockedApi.sendMessage.mockImplementationOnce(async () => ({
      id: 'reply-1',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'Here is a verified opportunity for you.',
      createdAt: new Date().toISOString(),
      opportunityAction,
    }));

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Find me a job training grant.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Here is a verified opportunity for you.');

    expect(
      within(screen.getByRole('region', { name: 'Active work' })).getByText('Needs you'),
    ).toBeInTheDocument();

    // Start a new turn whose reply has not arrived yet.
    let resolveSecond!: (value: Awaited<ReturnType<typeof conversationsApi.sendMessage>>) => void;
    mockedApi.sendMessage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecond = resolve;
      }),
    );
    await userEvent.type(textarea, 'Actually, something unrelated now.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    // While the new reply is still pending, the previous turn's opportunity
    // must not still be presented as something needing the member.
    await waitFor(() => {
      expect(
        within(screen.getByRole('region', { name: 'Active work' })).queryByText(
          'Needs you',
        ),
      ).not.toBeInTheDocument();
    });

    resolveSecond({
      id: 'reply-2',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'Second reply, no new opportunity.',
      createdAt: new Date().toISOString(),
    });
    await screen.findByText('Second reply, no new opportunity.');
    expect(
      within(screen.getByRole('region', { name: 'Active work' })).queryByText(
        'Needs you',
      ),
    ).not.toBeInTheDocument();
  });

  it('shows durable Carry State from the real Responsibility once one exists for this conversation, surviving conversation resume', async () => {
    mockedApi.listConversations.mockResolvedValue({
      data: [
        { id: 'conv-1', userId: 'member-1', title: 'Career grant', createdAt: 'x', updatedAt: 'x' },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedApi.listMessages.mockResolvedValue([
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'ASSISTANT',
        content: 'Here is a verified opportunity for you.',
        createdAt: '2026-09-01T19:00:00.000Z',
      },
    ]);
    mockedPeopleHelp.getActivePeopleApplicationHelp.mockImplementation(async (_token, conversationId) => {
      if (conversationId !== 'conv-1') return { session: null, responsibility: null };
      return {
        session: null,
        responsibility: makeResponsibility({
          status: 'WAITING_ON_USER',
          events: [
            {
              id: 'event-1',
              type: 'ACTION_EVIDENCED',
              actorClass: 'SYSTEM',
              actorUserId: null,
              fromStatus: 'ACTIVE',
              toStatus: 'ACTIVE',
              sourceSystem: 'GUIDED_APPLICATION',
              sourceRecordType: 'GuidedApplicationSession',
              sourceRecordId: 'session-1',
              sourceState: 'FIELD_REVIEWED',
              evidenceLevel: 'REPORTED',
              occurredAt: '2026-09-01T20:15:00.000Z',
            },
          ],
        }),
      };
    });

    renderSurface();

    // Resumed automatically — this is durable, persisted Carry State, not
    // something the member had to re-trigger this session.
    const summary = await screen.findByRole('region', { name: 'Active work' });
    // Outcome is the dominant heading — the real objective, directly.
    expect(
      within(summary).getByRole('heading', {
        name: 'Help me work through the verified application for Career Training Grant',
      }),
    ).toBeInTheDocument();
    expect(within(summary).getByText(/^Status/)).toBeInTheDocument();
    expect(
      within(summary).getByText(
        'Paused for you. Come back when you are ready and Aureus will pick it up here.',
      ),
    ).toBeInTheDocument();
    expect(within(summary).getByText('Needs you')).toBeInTheDocument();
    expect(within(summary).getByText('Next action')).toBeInTheDocument();
    expect(within(summary).getByText(/^You: /)).toBeInTheDocument();
    expect(within(summary).getByText('Evidence')).toBeInTheDocument();
    expect(within(summary).getByText(/^Last activity/)).toBeInTheDocument();
  });

  it('never borrows another conversation\'s Carry State when switching conversations', async () => {
    mockedApi.listConversations.mockResolvedValue({
      data: [
        { id: 'conv-alpha', userId: 'member-1', title: 'Alpha', createdAt: 'x', updatedAt: '2024-01-01T00:00:00.000Z' },
        { id: 'conv-beta', userId: 'member-1', title: 'Beta', createdAt: 'x', updatedAt: '2024-06-01T00:00:00.000Z' },
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedApi.listMessages.mockResolvedValue([]);
    mockedPeopleHelp.getActivePeopleApplicationHelp.mockImplementation(async (_token, conversationId) => {
      if (conversationId === 'conv-alpha') {
        return {
          session: null,
          responsibility: makeResponsibility({
            id: 'r-alpha',
            objective: 'Help me with the Alpha benefit application',
            originConversationId: 'conv-alpha',
            status: 'ACTIVE',
          }),
        };
      }
      if (conversationId === 'conv-beta') {
        return {
          session: null,
          responsibility: makeResponsibility({
            id: 'r-beta',
            objective: 'Help me with the Beta benefit application',
            originConversationId: 'conv-beta',
            status: 'WAITING_ON_USER',
          }),
        };
      }
      return { session: null, responsibility: null };
    });

    renderSurface();

    // Auto-resumes the most recently updated conversation (Beta) first.
    const betaSummary = await screen.findByRole('region', { name: 'Active work' });
    expect(within(betaSummary).getByText('Help me with the Beta benefit application')).toBeInTheDocument();
    expect(within(betaSummary).queryByText('Help me with the Alpha benefit application')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    await userEvent.click(screen.getByRole('button', { name: 'Alpha' }));

    await waitFor(() => {
      const alphaSummary = screen.getByRole('region', { name: 'Active work' });
      expect(within(alphaSummary).getByText('Help me with the Alpha benefit application')).toBeInTheDocument();
      expect(within(alphaSummary).queryByText('Help me with the Beta benefit application')).not.toBeInTheDocument();
    });
  });

  it('never renders the previous conversation\'s Carry State while the new conversation\'s fetch is still pending', async () => {
    mockedApi.listConversations.mockResolvedValue({
      data: [
        { id: 'conv-alpha', userId: 'member-1', title: 'Alpha', createdAt: 'x', updatedAt: '2024-01-01T00:00:00.000Z' },
        { id: 'conv-beta', userId: 'member-1', title: 'Beta', createdAt: 'x', updatedAt: '2024-06-01T00:00:00.000Z' },
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedApi.listMessages.mockResolvedValue([]);

    let resolveBeta!: (value: peopleHelpApi.ActivePeopleApplicationHelpDto | null) => void;
    const betaPending = new Promise<peopleHelpApi.ActivePeopleApplicationHelpDto | null>((resolve) => {
      resolveBeta = resolve;
    });

    mockedPeopleHelp.getActivePeopleApplicationHelp.mockImplementation(async (_token, conversationId) => {
      if (conversationId === 'conv-alpha') {
        return {
          session: null,
          responsibility: makeResponsibility({
            id: 'r-alpha',
            objective: 'Help me with the Alpha benefit application',
            originConversationId: 'conv-alpha',
            originOpportunityId: 'opportunity-alpha',
            status: 'ACTIVE',
          }),
        };
      }
      if (conversationId === 'conv-beta') {
        return betaPending;
      }
      return { session: null, responsibility: null };
    });
    mockedPeopleHelp.startPeopleApplicationHelp.mockResolvedValue({
      responsibility: makeResponsibility({
        id: 'r-beta',
        objective: 'Help me with the Beta benefit application',
        originConversationId: 'conv-beta',
        originOpportunityId: 'opportunity-beta',
        status: 'ACTIVE',
      }),
      session: {
        id: 'session-beta',
        conversationId: 'conv-beta',
        opportunityId: 'opportunity-beta',
        responsibilityId: 'r-beta',
        opportunityTitle: 'Beta benefit',
        provider: 'Beta Provider',
        applicationUrl: 'https://example.com/beta',
        status: 'ACTIVE',
        screenCaptureConsentGrantedAt: null,
        screenCaptureConsentRevokedAt: null,
        lastFrameAnalyzedAt: null,
      },
    });

    renderSurface();

    // Auto-resumes Beta first (most recently updated) — its fetch is the
    // still-pending one, so nothing durable is shown for it yet.
    await screen.findByText('How can we help?');

    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    await userEvent.click(screen.getByRole('button', { name: 'Alpha' }));

    // Alpha's own fetch resolves immediately and shows Alpha's real state,
    // including its Needs You callout and its own Resume action (ACTIVE
    // with no session offers "Continue with Aureus").
    const alphaSummary = await screen.findByRole('region', { name: 'Active work' });
    expect(within(alphaSummary).getByText('Help me with the Alpha benefit application')).toBeInTheDocument();
    expect(within(alphaSummary).getByText('Needs you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with aureus/i })).toBeInTheDocument();

    // Switch back to Beta, whose fetch is STILL unresolved. The History
    // dialog is already open from selecting Alpha (selecting a conversation
    // does not close it), so this clicks "Beta" directly rather than
    // toggling "History" again, which would only close it. Alpha's
    // objective/status/evidence must never appear as Beta's Carry State
    // while Beta's own fetch is pending (independent audit, PR #160) — the
    // effect clears state synchronously on every conversation switch rather
    // than leaving the previous conversation's values rendered until the
    // new fetch settles.
    await userEvent.click(screen.getByRole('button', { name: 'Beta' }));

    expect(screen.queryByText('Help me with the Alpha benefit application')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Active work' })).not.toBeInTheDocument();
    // Alpha's Active Work Surface — and, critically, its Resume action
    // bound to Alpha's opportunity — must not still be on screen under Beta
    // (a re-review finding: the stale card's onResume closed over Alpha's
    // originOpportunityId while startApplicationGuideForOpportunity always
    // targets the *current* conversation, which would have bound Alpha's
    // opportunity to Beta's conversation on a fast click).
    expect(screen.queryByRole('button', { name: /continue with aureus/i })).not.toBeInTheDocument();

    resolveBeta({
      session: null,
      responsibility: makeResponsibility({
        id: 'r-beta',
        objective: 'Help me with the Beta benefit application',
        originConversationId: 'conv-beta',
        originOpportunityId: 'opportunity-beta',
        status: 'WAITING_ON_USER',
      }),
    });

    const betaSummary = await screen.findByRole('region', { name: 'Active work' });
    expect(within(betaSummary).getByText('Help me with the Beta benefit application')).toBeInTheDocument();
    expect(within(betaSummary).queryByText('Help me with the Alpha benefit application')).not.toBeInTheDocument();

    // Beta's own real card/Resume action now appears, and clicking it
    // targets Beta's own opportunity — never Alpha's.
    await userEvent.click(screen.getByRole('button', { name: /continue with aureus/i }));
    await waitFor(() => {
      expect(mockedPeopleHelp.startPeopleApplicationHelp).toHaveBeenCalledWith(
        'token-123',
        'conv-beta',
        'opportunity-beta',
      );
    });
    expect(mockedPeopleHelp.startPeopleApplicationHelp).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'opportunity-alpha',
    );
  });

  it('never renders the previous conversation\'s ApplicationGuidePanel while the new conversation is active', async () => {
    mockedApi.listConversations.mockResolvedValue({
      data: [
        { id: 'conv-alpha', userId: 'member-1', title: 'Alpha', createdAt: 'x', updatedAt: '2024-01-01T00:00:00.000Z' },
        { id: 'conv-beta', userId: 'member-1', title: 'Beta', createdAt: 'x', updatedAt: '2024-06-01T00:00:00.000Z' },
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedApi.listMessages.mockResolvedValue([]);
    mockedPeopleHelp.getActivePeopleApplicationHelp.mockImplementation(async (_token, conversationId) => {
      if (conversationId === 'conv-alpha') {
        return {
          session: {
            id: 'session-alpha',
            conversationId: 'conv-alpha',
            opportunityId: 'opportunity-alpha',
            responsibilityId: 'r-alpha',
            opportunityTitle: 'Alpha benefit',
            provider: 'Alpha Provider',
            applicationUrl: 'https://example.com/alpha',
            status: 'ACTIVE',
            screenCaptureConsentGrantedAt: null,
            screenCaptureConsentRevokedAt: null,
            lastFrameAnalyzedAt: null,
          },
          responsibility: makeResponsibility({
            id: 'r-alpha',
            objective: 'Help me with the Alpha benefit application',
            originConversationId: 'conv-alpha',
            status: 'ACTIVE',
          }),
        };
      }
      return { session: null, responsibility: null };
    });

    renderSurface();

    // Auto-resumes Beta first (most recently updated, no active help).
    await screen.findByText('How can we help?');
    expect(screen.queryByRole('region', { name: 'Application guidance' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    await userEvent.click(screen.getByRole('button', { name: 'Alpha' }));

    // Alpha genuinely has an active guide session — its panel is real here.
    expect(await screen.findByRole('region', { name: 'Application guidance' })).toBeInTheDocument();

    // Switching back to Beta, which has no application help at all, must
    // not leave Alpha's ApplicationGuidePanel mounted.
    await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Application guidance' })).not.toBeInTheDocument();
    });
  });

  it('does not claim Aureus is currently guiding, and assigns the next action to the member, for an ACTIVE Responsibility with no live guide session', async () => {
    mockedApi.listConversations.mockResolvedValue({
      data: [{ id: 'conv-1', userId: 'member-1', title: 'Career grant', createdAt: 'x', updatedAt: 'x' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedApi.listMessages.mockResolvedValue([]);
    mockedPeopleHelp.getActivePeopleApplicationHelp.mockResolvedValue({
      // No active guide session — a real, valid state: OR-002 accepts the
      // Responsibility before the guide session necessarily exists, and a
      // member can leave/return without an explicit pause.
      session: null,
      responsibility: makeResponsibility({ status: 'ACTIVE' }),
    });

    renderSurface();

    const summary = await screen.findByRole('region', { name: 'Active work' });
    expect(within(summary).queryByText(/guiding you/i)).not.toBeInTheDocument();
    expect(
      within(summary).getByText('Aureus accepted this and is ready to continue — resume when you are ready.'),
    ).toBeInTheDocument();
    expect(within(summary).getByText('Needs you')).toBeInTheDocument();
    expect(
      within(summary).getByText('Resume the guided application to continue — Aureus is ready when you are.'),
    ).toBeInTheDocument();
    expect(within(summary).getByText('Next action')).toBeInTheDocument();
    // Next action must be owned by the member, not Aureus, since no
    // execution is actually occurring right now.
    expect(within(summary).getByText(/^You: Resume the guided application/)).toBeInTheDocument();
  });

  it('does not describe a completed Responsibility as currently being carried, and clears Needs you/Next action', async () => {
    mockedApi.listConversations.mockResolvedValue({
      data: [{ id: 'conv-1', userId: 'member-1', title: 'Career grant', createdAt: 'x', updatedAt: 'x' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedApi.listMessages.mockResolvedValue([]);
    mockedPeopleHelp.getActivePeopleApplicationHelp.mockResolvedValue({
      session: null,
      responsibility: makeResponsibility({
        status: 'COMPLETED',
        completedAt: '2026-09-01T21:00:00.000Z',
        events: [
          {
            id: 'event-completed',
            type: 'COMPLETED',
            actorClass: 'SYSTEM',
            actorUserId: null,
            fromStatus: 'ACTIVE',
            toStatus: 'COMPLETED',
            sourceSystem: 'OPPORTUNITY_ENGINE',
            sourceRecordType: 'SavedOpportunity',
            sourceRecordId: 'saved-1',
            sourceState: 'APPLIED',
            evidenceLevel: 'REPORTED',
            occurredAt: '2026-09-01T21:00:00.000Z',
          },
        ],
      }),
    });

    renderSurface();

    const summary = await screen.findByRole('region', { name: 'Active work' });
    expect(within(summary).getByText('Completed — nothing further to carry.')).toBeInTheDocument();
    expect(within(summary).queryByText(/guiding you through|in progress/i)).not.toBeInTheDocument();
    expect(within(summary).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Next action')).not.toBeInTheDocument();
    expect(within(summary).getByText('Evidence')).toBeInTheDocument();
    expect(within(summary).getByText(/You reported: submitted\/applied/)).toBeInTheDocument();
  });

  it('shows an honest idle Carry State — the real conversational fallback, never a fabricated Responsibility — when nothing durable is being carried', async () => {
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    mockedApi.sendMessage.mockResolvedValue({
      id: 'reply-1',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'Sure, tell me more.',
      createdAt: 'x',
    });
    // Explicit for clarity, though this is already the beforeEach default.
    mockedPeopleHelp.getActivePeopleApplicationHelp.mockResolvedValue({
      session: null,
      responsibility: null,
    });

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Just thinking out loud for now.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Sure, tell me more.');

    const summary = screen.getByRole('region', { name: 'Active work' });
    expect(within(summary).getByText('Just thinking out loud for now.')).toBeInTheDocument();
    expect(
      within(summary).getByText('Nothing further in progress right now — ask for more anytime.'),
    ).toBeInTheDocument();
    // No durable Responsibility exists, so none of the Carry-State-only rows are invented.
    expect(within(summary).queryByText('Status')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Next action')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Evidence')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Last activity')).not.toBeInTheDocument();
  });

  it('resumes the most recently updated conversation automatically for a returning member', async () => {
    mockedApi.listConversations.mockResolvedValue({
      data: [
        {
          id: 'conv-older',
          userId: 'member-1',
          title: null,
          createdAt: 'x',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'conv-newer',
          userId: 'member-1',
          title: null,
          createdAt: 'x',
          updatedAt: '2024-06-01T00:00:00.000Z',
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedApi.listMessages.mockImplementation(async (_token, conversationId) => {
      if (conversationId === 'conv-newer') {
        return [
          {
            id: 'msg-newer',
            conversationId: 'conv-newer',
            role: 'ASSISTANT',
            content: 'Welcome back — picking up where we left off.',
            createdAt: 'x',
          },
        ];
      }
      return [
        {
          id: 'msg-older',
          conversationId: 'conv-older',
          role: 'ASSISTANT',
          content: 'This is the older conversation.',
          createdAt: 'x',
        },
      ];
    });

    renderSurface();

    // Resumed without any click on History/New — a returning member never
    // lands on an empty "How can we help?" while a real conversation exists.
    expect(
      await screen.findByText('Welcome back — picking up where we left off.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('This is the older conversation.')).not.toBeInTheDocument();
    expect(screen.queryByText('How can we help?')).not.toBeInTheDocument();
  });

  it('shows a calm, retryable error state and preserves the draft on 503', async () => {
    mockedApi.createConversation.mockRejectedValue(
      new ApiError(503, 'The AI service is temporarily unavailable'),
    );

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Please help me plan.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Your steward is temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe('Please help me plan.');
  });

  it('has no accessibility violations in its default authenticated state', async () => {
    const { container } = renderSurface();
    await screen.findByText('How can we help?');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('switches to voice mode on the same conversation, and back — text ↔ voice continuity', async () => {
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    mockedApi.sendMessage.mockResolvedValue({
      id: 'reply-1',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'Hello.',
      createdAt: 'x',
    });
    mockedVoiceApi.startVoiceSession.mockResolvedValue({
      id: 'vs-1',
      conversationId: 'conv-1',
      clientSecret: 'secret',
      expiresAt: 'x',
      model: 'gpt-4o-realtime-preview',
      voice: 'alloy',
      turnDetectionMode: 'semantic_vad',
      startedAt: 'x',
      endedAt: null,
    });

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Hello, I need help.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText('Hello.')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Talk' }));
    expect(screen.getByRole('button', { name: 'Start voice conversation' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));

    // The same conversation is continued by voice, not a new one.
    expect(mockedVoiceApi.startVoiceSession).toHaveBeenCalledWith('token-123', 'conv-1');

    await userEvent.click(screen.getByRole('button', { name: 'Type' }));
    expect(await screen.findByText('Hello.')).toBeInTheDocument();
  });

  it('shows a coordinated plan built during this conversation inline, and approving it calls the real recommendation approval — never a second, invented mechanism', async () => {
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    mockedApi.sendMessage.mockResolvedValue({
      id: 'reply-1',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'Got it.',
      createdAt: 'x',
    });
    const recommendation = {
      id: 'rec-1',
      userId: 'member-1',
      opportunityId: 'opp-1',
      resourceId: null,
      courseId: null,
      podId: null,
      rationale: 'This matches your goal.',
      status: 'PENDING' as const,
      decidedAt: null,
      createdAt: 'x',
    };
    mockedPlan.buildCoordinatedPlan.mockResolvedValue({
      run: {
        id: 'run-1',
        userId: 'member-1',
        goal: 'COORDINATED_PLAN',
        capabilitiesInvoked: ['RECOMMENDATION'],
        outcome: 'Built a coordinated plan.',
        status: 'SUCCESS',
        latencyMs: 5,
        createdAt: 'x',
      },
      plan: {
        primary: {
          source: 'RECOMMENDATION',
          recommendation,
          cityResource: null,
          categoryLabel: 'Opportunity',
        },
        supporting: [],
        combinedRationale: 'Opportunity is the strongest real option available right now.',
        additionalPossibilitiesCount: 0,
      },
    });
    mockedOpportunities.getOpportunity.mockResolvedValue({
      id: 'opp-1',
      opportunityRef: 'AUR-OPP-000001',
      title: 'Career Training Grant',
      shortDescription: 'A short description.',
      fullDescription: 'Full description.',
      category: 'EMPLOYMENT',
      tags: [],
      provider: 'Department of Labor',
      officialSourceUrl: 'https://example.com',
      applicationUrl: null,
      location: null,
      country: null,
      state: null,
      eligibilityRules: 'Open to all',
      benefitType: 'TRAINING',
      benefitAmount: null,
      deadline: null,
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      rejectionReason: null,
      confidenceScore: 90,
      freshnessScore: 90,
      datePublished: null,
      dateLastVerified: null,
      sourceName: 'DOL',
      sourceUrl: null,
      sourceType: 'ADMIN_ENTRY',
      submittedById: 'admin-1',
      createdById: 'admin-1',
      lastUpdatedById: 'admin-1',
      createdAt: 'x',
      updatedAt: 'x',
      deletedAt: null,
    });

    let api!: { buildPlan: () => void };
    function BuildPlanHarness() {
      const plan = usePlan();
      api = { buildPlan: () => void plan.buildPlan() };
      return null;
    }

    render(
      <SessionProvider>
        <ConversationProvider>
          <VoiceProvider>
            <JourneyProvider>
              <PlanProvider>
                <RecommendationsProvider>
                  <ConnectedExperiencesProvider>
                    <SignedInAs>
                      <ConversationSurface />
                      <BuildPlanHarness />
                    </SignedInAs>
                  </ConnectedExperiencesProvider>
                </RecommendationsProvider>
              </PlanProvider>
            </JourneyProvider>
          </VoiceProvider>
        </ConversationProvider>
      </SessionProvider>,
    );

    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Hello, I need help.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText('Got it.')).toBeInTheDocument());

    api.buildPlan();
    await waitFor(() => expect(screen.getByText('This matches your goal.')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(mockedRecommendations.approveRecommendation).toHaveBeenCalledWith(
        'token-123',
        'rec-1',
      ),
    );
  });
});
