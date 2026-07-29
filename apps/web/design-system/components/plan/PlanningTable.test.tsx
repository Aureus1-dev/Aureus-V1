import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { PlanProvider } from '../../../state/plan/PlanContext';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { PlanningTable } from './PlanningTable';
import * as planApi from '../../../lib/api/plan';
import * as recommendationsApi from '../../../lib/api/recommendations';
import * as opportunitiesApi from '../../../lib/api/opportunities';

jest.mock('../../../lib/api/plan');
jest.mock('../../../lib/api/recommendations');
jest.mock('../../../lib/api/opportunities');

const mockedPlan = planApi as jest.Mocked<typeof planApi>;
const mockedRecommendations = recommendationsApi as jest.Mocked<typeof recommendationsApi>;
const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;

const planRecommendation = {
  id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
  rationale: 'This matches your goal of finding a better job.', status: 'PENDING' as const, decidedAt: null, createdAt: 'x',
};

const otherRecommendation = {
  id: 'rec-2', userId: 'member-1', opportunityId: 'opp-2', resourceId: null, courseId: null, podId: null,
  rationale: 'This could also help.', status: 'PENDING' as const, decidedAt: null, createdAt: 'x',
};

const opportunityFixture = (id: string, title: string) => ({
  id, opportunityRef: `AUR-OPP-${id}`, title, shortDescription: 'A short description.',
  fullDescription: 'Full description.', category: 'EMPLOYMENT' as const, tags: [], provider: 'Department of Labor',
  officialSourceUrl: 'https://example.com', applicationUrl: null, location: null, country: null, state: null,
  eligibilityRules: 'Open to all', benefitType: 'TRAINING' as const, benefitAmount: null, deadline: null,
  status: 'ACTIVE' as const, verificationStatus: 'VERIFIED' as const, rejectionReason: null, confidenceScore: 90,
  freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'DOL', sourceUrl: null,
  sourceType: 'ADMIN_ENTRY' as const, submittedById: 'admin-1', createdById: 'admin-1', lastUpdatedById: 'admin-1',
  createdAt: 'x', updatedAt: 'x', deletedAt: null,
});

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderTable() {
  return render(
    <SessionProvider>
      <PlanProvider>
        <RecommendationsProvider>
          <SignedInAs>
            <PlanningTable />
          </SignedInAs>
        </RecommendationsProvider>
      </PlanProvider>
    </SessionProvider>,
  );
}

describe('PlanningTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRecommendations.listRecommendations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedOpportunities.getOpportunity.mockImplementation((_token, id) =>
      Promise.resolve(opportunityFixture(id, id === 'opp-1' ? 'Career Training Grant' : 'Another Opportunity')),
    );
  });

  it('builds a coordinated plan with no needId on mount, since there is no specific conversation to ground it in', async () => {
    mockedPlan.buildCoordinatedPlan.mockResolvedValue({
      run: {
        id: 'run-1', userId: 'member-1', goal: 'COORDINATED_PLAN', capabilitiesInvoked: ['RECOMMENDATION'],
        outcome: 'Built a coordinated plan.', status: 'SUCCESS', latencyMs: 5, createdAt: 'x',
      },
      plan: {
        primary: { source: 'RECOMMENDATION', recommendation: planRecommendation, cityResource: null, categoryLabel: 'Opportunity' },
        supporting: [],
        combinedRationale: 'Opportunity is the strongest real option available right now.',
        additionalPossibilitiesCount: 0,
      },
    });

    renderTable();

    await waitFor(() => expect(mockedPlan.buildCoordinatedPlan).toHaveBeenCalledWith('token-123', undefined));
    expect(await screen.findByText('This matches your goal of finding a better job.')).toBeInTheDocument();
  });

  it('approving a plan item calls the real recommendation approval — never a second, invented mechanism', async () => {
    mockedPlan.buildCoordinatedPlan.mockResolvedValue({
      run: {
        id: 'run-1', userId: 'member-1', goal: 'COORDINATED_PLAN', capabilitiesInvoked: ['RECOMMENDATION'],
        outcome: 'Built a coordinated plan.', status: 'SUCCESS', latencyMs: 5, createdAt: 'x',
      },
      plan: {
        primary: { source: 'RECOMMENDATION', recommendation: planRecommendation, cityResource: null, categoryLabel: 'Opportunity' },
        supporting: [],
        combinedRationale: 'Opportunity is the strongest real option available right now.',
        additionalPossibilitiesCount: 0,
      },
    });
    mockedRecommendations.approveRecommendation.mockResolvedValue({ ...planRecommendation, status: 'ACCEPTED', decidedAt: 'x' });

    renderTable();
    const user = userEvent.setup();

    await screen.findByText('This matches your goal of finding a better job.');
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(mockedRecommendations.approveRecommendation).toHaveBeenCalledWith('token-123', 'rec-1'));
  });

  it('lists a pending recommendation not already covered by the coordinated plan, under "Also waiting on you"', async () => {
    mockedPlan.buildCoordinatedPlan.mockResolvedValue({
      run: {
        id: 'run-1', userId: 'member-1', goal: 'COORDINATED_PLAN', capabilitiesInvoked: ['RECOMMENDATION'],
        outcome: 'Built a coordinated plan.', status: 'SUCCESS', latencyMs: 5, createdAt: 'x',
      },
      plan: {
        primary: { source: 'RECOMMENDATION', recommendation: planRecommendation, cityResource: null, categoryLabel: 'Opportunity' },
        supporting: [],
        combinedRationale: 'Opportunity is the strongest real option available right now.',
        additionalPossibilitiesCount: 0,
      },
    });
    mockedRecommendations.listRecommendations.mockResolvedValue({
      data: [planRecommendation, otherRecommendation], total: 2, page: 1, limit: 20, totalPages: 1,
    });

    renderTable();

    await screen.findByText('This matches your goal of finding a better job.');
    expect(await screen.findByText('Also waiting on you')).toBeInTheDocument();
    expect(screen.getByText('This could also help.')).toBeInTheDocument();
    // The primary plan item's own recommendation is never duplicated below it.
    expect(screen.getAllByText('This matches your goal of finding a better job.')).toHaveLength(1);
  });

  it('shows an empty state when there is nothing to coordinate yet', async () => {
    mockedPlan.buildCoordinatedPlan.mockResolvedValue({
      run: {
        id: 'run-1', userId: 'member-1', goal: 'COORDINATED_PLAN', capabilitiesInvoked: [],
        outcome: 'no candidate action was available right now.', status: 'NO_ACTION', latencyMs: 5, createdAt: 'x',
      },
    });

    renderTable();

    expect(await screen.findByText('Nothing to coordinate yet')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    mockedPlan.buildCoordinatedPlan.mockResolvedValue({
      run: {
        id: 'run-1', userId: 'member-1', goal: 'COORDINATED_PLAN', capabilitiesInvoked: [],
        outcome: 'no candidate action was available right now.', status: 'NO_ACTION', latencyMs: 5, createdAt: 'x',
      },
    });
    const { container } = renderTable();
    await screen.findByText('Nothing to coordinate yet');
    expect(await axe(container)).toHaveNoViolations();
  });
});
