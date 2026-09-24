import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import * as goalsApi from '../../../lib/api/goals';
import * as planApi from '../../../lib/api/plan';
import * as needsApi from '../../../lib/api/needs';
import * as documentsApi from '../../../lib/api/documents';
import * as peopleHelpApi from '../../../lib/api/people-help';
import * as responsibilitiesApi from '../../../lib/api/responsibilities';

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
jest.mock('../../../lib/api/responsibilities');
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockedApi = conversationsApi as jest.Mocked<typeof conversationsApi>;
const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;
const mockedPlan = planApi as jest.Mocked<typeof planApi>;
const mockedNeeds = needsApi as jest.Mocked<typeof needsApi>;
const mockedDocuments = documentsApi as jest.Mocked<typeof documentsApi>;
const mockedPeopleHelp = peopleHelpApi as jest.Mocked<typeof peopleHelpApi>;
const mockedResponsibilities = responsibilitiesApi as jest.Mocked<typeof responsibilitiesApi>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({
      ...session,
      isAuthenticated: true,
      accessToken: 'token-123',
      memberId: 'member-1',
    });
  }
  return <>{children}</>;
}

const sharedResource: needsApi.MatchedResourceDto = {
  id: 'resource-shared',
  citySheetRef: 'AUR-CITY-000001',
  organizationName: 'Shared Community Resource',
  category: 'HOUSING',
  description: 'A verified resource that can appear in more than one conversation.',
  address: null,
  serviceArea: 'Philadelphia',
  phone: null,
  website: null,
  hours: 'Weekdays',
  eligibilityRequirements: 'Philadelphia residents',
  languagesSupported: ['English'],
  accessibilityNotes: null,
  cost: 'Free',
  requiredDocuments: [],
  referralRequired: false,
  isEmergencyService: false,
  verificationStatus: 'VERIFIED',
  isTestFixture: false,
};

function makePlanResponse(): planApi.OrchestrateResponseDto {
  return {
    run: {
      id: `run-${Math.random()}`,
      userId: 'member-1',
      goal: 'COORDINATED_PLAN',
      capabilitiesInvoked: ['CITY_RESOURCE'],
      outcome: 'Built a coordinated plan.',
      status: 'SUCCESS',
      latencyMs: 5,
      createdAt: new Date().toISOString(),
    },
    plan: {
      primary: {
        source: 'CITY_RESOURCE',
        recommendation: null,
        cityResource: { ...sharedResource },
        categoryLabel: 'Local resource',
      },
      supporting: [],
      combinedRationale: 'This is a real resource for the current need.',
      additionalPossibilitiesCount: 0,
    },
  };
}

describe('ConversationSurface UI-007 conversation isolation', () => {
  it('does not carry a resource decision or stale need from conversation A into conversation B', async () => {
    mockedApi.listConversations.mockResolvedValue({
      data: [
        {
          id: 'conv-alpha',
          userId: 'member-1',
          title: 'Alpha',
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-02T00:00:00.000Z',
        },
        {
          id: 'conv-beta',
          userId: 'member-1',
          title: 'Beta',
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    mockedApi.listMessages.mockResolvedValue([]);
    mockedGoals.listGoals.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
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
    mockedResponsibilities.getMyResponsibilities.mockResolvedValue([]);
    mockedPlan.buildCoordinatedPlan.mockImplementation(async () => makePlanResponse());

    let resolveBetaNeeds!: (needs: needsApi.StatedNeedDto[]) => void;
    mockedNeeds.getMyNeeds
      .mockResolvedValueOnce([
        {
          id: 'need-alpha',
          conversationId: 'conv-alpha',
          content: 'Alpha need',
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ])
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveBetaNeeds = resolve;
        }),
      );

    mockedNeeds.offerResource.mockImplementation(async (_token, needId, citySheetEntryId) => ({
      id: `offer-${needId}`,
      statedNeedId: needId,
      citySheetEntryId,
      response: 'PENDING',
      offeredAt: '2026-09-02T00:00:00.000Z',
      respondedAt: null,
    }));
    mockedNeeds.respondToOffer.mockImplementation(
      async (_token, needId, citySheetEntryId, accepted) => ({
        id: `offer-${needId}`,
        statedNeedId: needId,
        citySheetEntryId,
        response: accepted ? 'ACCEPTED' : 'DECLINED',
        offeredAt: '2026-09-02T00:00:00.000Z',
        respondedAt: '2026-09-02T00:01:00.000Z',
      }),
    );

    let planHarness!: { buildPlan: () => Promise<void> };
    function BuildPlanHarness() {
      const plan = usePlan();
      planHarness = { buildPlan: () => plan.buildPlan() };
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

    await waitFor(() =>
      expect(mockedApi.listMessages).toHaveBeenCalledWith('token-123', 'conv-alpha'),
    );

    await act(async () => {
      await planHarness.buildPlan();
    });

    await waitFor(() =>
      expect(mockedNeeds.offerResource).toHaveBeenCalledWith(
        'token-123',
        'need-alpha',
        'resource-shared',
      ),
    );
    expect(await screen.findByRole('button', { name: 'Use this resource' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Use this resource' }));
    await waitFor(() =>
      expect(mockedNeeds.respondToOffer).toHaveBeenCalledWith(
        'token-123',
        'need-alpha',
        'resource-shared',
        true,
      ),
    );
    expect(await screen.findByText('You accepted this resource.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
    await waitFor(() =>
      expect(mockedApi.listMessages).toHaveBeenCalledWith('token-123', 'conv-beta'),
    );

    // Beta's need lookup is intentionally still unresolved. Give Beta a new
    // plan containing the exact same city resource while the lookup is pending.
    await act(async () => {
      await planHarness.buildPlan();
    });

    expect(await screen.findByText('This resource offer is not ready for a decision yet.')).toBeInTheDocument();
    expect(screen.queryByText('You accepted this resource.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use this resource' })).not.toBeInTheDocument();

    // The plan arriving in Beta must not trigger an offer against Alpha's
    // stale need. Alpha's one legitimate offer is still the only offer call.
    expect(mockedNeeds.offerResource).toHaveBeenCalledTimes(1);

    resolveBetaNeeds([
      {
        id: 'need-beta',
        conversationId: 'conv-beta',
        content: 'Beta need',
        createdAt: '2026-09-02T00:00:00.000Z',
      },
    ]);

    await waitFor(() =>
      expect(mockedNeeds.offerResource).toHaveBeenNthCalledWith(
        2,
        'token-123',
        'need-beta',
        'resource-shared',
      ),
    );
    expect(await screen.findByRole('button', { name: 'Use this resource' })).toBeInTheDocument();
    expect(screen.queryByText('You accepted this resource.')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Use this resource' }));
    await waitFor(() =>
      expect(mockedNeeds.respondToOffer).toHaveBeenNthCalledWith(
        2,
        'token-123',
        'need-beta',
        'resource-shared',
        true,
      ),
    );
  });
});
