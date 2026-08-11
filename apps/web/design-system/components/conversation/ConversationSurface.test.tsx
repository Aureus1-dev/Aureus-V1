import { render, screen, waitFor } from '@testing-library/react';
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
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockedApi = conversationsApi as jest.Mocked<typeof conversationsApi>;
const mockedVoiceApi = voiceApi as jest.Mocked<typeof voiceApi>;
const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;
const mockedPlan = planApi as jest.Mocked<typeof planApi>;
const mockedNeeds = needsApi as jest.Mocked<typeof needsApi>;
const mockedDocuments = documentsApi as jest.Mocked<typeof documentsApi>;
const mockedRecommendations = recommendationsApi as jest.Mocked<typeof recommendationsApi>;
const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;

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
  });

  it('prompts sign-in when the member is not authenticated, without calling the API', () => {
    renderSurface({ signedIn: false });
    expect(screen.getByText('Sign in to talk with your steward')).toBeInTheDocument();
    expect(mockedApi.listConversations).not.toHaveBeenCalled();
  });

  it('shows an empty state before any message has been sent', async () => {
    renderSurface();
    expect(await screen.findByText('How can we help?')).toBeInTheDocument();
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

    await waitFor(() => expect(screen.getByText('Hello, I need help.')).toBeInTheDocument());
    expect(await screen.findByText('It sounds like you want to get started.')).toBeInTheDocument();
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
      provider: 'OPENAI',
      transport: 'openai-webrtc',
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
