import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { useRecommendationSubjects } from './useRecommendationSubjects';
import * as opportunitiesApi from '../../../lib/api/opportunities';
import type { RecommendationDto } from '../../../lib/api/recommendations';
import type { RecommendationSubject } from './RecommendationCard';

jest.mock('../../../lib/api/opportunities');

const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;

function makeRecommendation(o: Partial<RecommendationDto>): RecommendationDto {
  return {
    id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
    rationale: 'Matches your goal.', status: 'PENDING', decidedAt: null, createdAt: 'x', ...o,
  };
}

interface HarnessApi {
  subjectsById: Record<string, RecommendationSubject>;
  setToken: (t: string) => void;
}

function Harness({
  recommendations,
  onReady,
}: {
  recommendations: RecommendationDto[];
  onReady: (value: HarnessApi) => void;
}) {
  const subjectsById = useRecommendationSubjects(recommendations);
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      subjectsById,
      setToken: (token: string) => setSession({ ...session, isAuthenticated: true, accessToken: token, memberId: 'member-1' }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectsById, session]);

  return null;
}

function renderHarness(recommendations: RecommendationDto[]) {
  let api!: HarnessApi;
  const view = render(
    <SessionProvider>
      <Harness recommendations={recommendations} onReady={(value) => (api = value)} />
    </SessionProvider>,
  );
  return { getApi: () => api, rerender: view.rerender };
}

describe('useRecommendationSubjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves each opportunity-linked recommendation to its title and short description, keyed by recommendation id', async () => {
    mockedOpportunities.getOpportunity.mockResolvedValue({
      id: 'opp-1', opportunityRef: null, title: 'Community Grant', shortDescription: 'A grant.', fullDescription: 'x',
      category: 'GRANT', tags: [], provider: 'City Hall', officialSourceUrl: 'https://example.com', applicationUrl: null,
      location: null, country: null, state: null, eligibilityRules: 'x', benefitType: 'GRANT', benefitAmount: null,
      deadline: null, status: 'ACTIVE', verificationStatus: 'VERIFIED', rejectionReason: null, confidenceScore: 90,
      freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'City Hall', sourceUrl: null,
      sourceType: 'ADMIN_ENTRY', submittedById: 'admin-1', createdById: 'admin-1', lastUpdatedById: 'admin-1',
      createdAt: 'x', updatedAt: 'x', deletedAt: null,
    });

    const { getApi } = renderHarness([makeRecommendation({ id: 'rec-1', opportunityId: 'opp-1' })]);
    await act(async () => getApi().setToken('token-123'));
    await act(async () => Promise.resolve());

    expect(mockedOpportunities.getOpportunity).toHaveBeenCalledWith('token-123', 'opp-1');
    expect(getApi().subjectsById['rec-1']).toEqual({ title: 'Community Grant', description: 'A grant.' });
  });

  it('never fetches for recommendations with no opportunity target', async () => {
    const { getApi } = renderHarness([makeRecommendation({ id: 'rec-1', opportunityId: null, resourceId: 'res-1' })]);
    await act(async () => getApi().setToken('token-123'));
    await act(async () => Promise.resolve());

    expect(mockedOpportunities.getOpportunity).not.toHaveBeenCalled();
  });
});
