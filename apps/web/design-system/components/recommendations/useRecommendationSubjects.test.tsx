import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { useRecommendationSubjects } from './useRecommendationSubjects';
import * as opportunitiesApi from '../../../lib/api/opportunities';
import * as academyApi from '../../../lib/api/academy';
import * as resourcesApi from '../../../lib/api/resources';
import * as podsApi from '../../../lib/api/pods';
import type { RecommendationDto } from '../../../lib/api/recommendations';
import type { RecommendationSubject } from './RecommendationCard';

jest.mock('../../../lib/api/opportunities');
jest.mock('../../../lib/api/academy');
jest.mock('../../../lib/api/resources');
jest.mock('../../../lib/api/pods');

const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;
const mockedAcademy = academyApi as jest.Mocked<typeof academyApi>;
const mockedResources = resourcesApi as jest.Mocked<typeof resourcesApi>;
const mockedPods = podsApi as jest.Mocked<typeof podsApi>;

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

  it('never fetches for a recommendation with no resolvable target (e.g. a Steward escalation)', async () => {
    const { getApi } = renderHarness([makeRecommendation({ id: 'rec-1', opportunityId: null })]);
    await act(async () => getApi().setToken('token-123'));
    await act(async () => Promise.resolve());

    expect(mockedOpportunities.getOpportunity).not.toHaveBeenCalled();
    expect(mockedAcademy.getCourse).not.toHaveBeenCalled();
    expect(mockedResources.getResource).not.toHaveBeenCalled();
    expect(mockedPods.getPod).not.toHaveBeenCalled();
  });

  it('resolves each course-linked recommendation to its title and short description, keyed by recommendation id', async () => {
    mockedAcademy.getCourse.mockResolvedValue({
      id: 'course-1', courseRef: null, title: 'Financial Foundations', shortDescription: 'Build good money habits.',
      fullDescription: 'x', learningDomain: 'FINANCIAL_LITERACY', estimatedDurationMinutes: 60, status: 'ACTIVE',
      verificationStatus: 'VERIFIED', rejectionReason: null, version: 1, grantsCertification: false,
      organizationId: null, authorId: 'steward-1', lastUpdatedById: 'steward-1', datePublished: 'x',
      createdAt: 'x', updatedAt: 'x',
    });

    const { getApi } = renderHarness([makeRecommendation({ id: 'rec-1', opportunityId: null, courseId: 'course-1' })]);
    await act(async () => getApi().setToken('token-123'));
    await act(async () => Promise.resolve());

    expect(mockedAcademy.getCourse).toHaveBeenCalledWith('token-123', 'course-1');
    expect(getApi().subjectsById['rec-1']).toEqual({ title: 'Financial Foundations', description: 'Build good money habits.' });
  });

  it('resolves each resource-linked recommendation to its title and short description, keyed by recommendation id', async () => {
    mockedResources.getResource.mockResolvedValue({
      id: 'res-1', resourceRef: null, title: 'Chester County Food Bank', shortDescription: 'Free groceries weekly.',
      fullDescription: 'x', category: 'NONPROFIT_ORGANIZATION', resourceType: 'ORGANIZATION', tags: [],
      organizationName: 'Chester County Food Bank', officialSourceUrl: 'https://example.com', contactName: null,
      contactEmail: null, contactPhone: null, location: null, country: null, state: null, city: null,
      isRemote: false, eligibilityNotes: null, status: 'ACTIVE', verificationStatus: 'VERIFIED', rejectionReason: null,
      confidenceScore: 90, freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'City Hall',
      sourceUrl: null, sourceType: 'ADMIN_ENTRY', ownerId: 'admin-1', submittedById: 'admin-1', createdById: 'admin-1',
      lastUpdatedById: 'admin-1', createdAt: 'x', updatedAt: 'x', deletedAt: null,
    });

    const { getApi } = renderHarness([makeRecommendation({ id: 'rec-1', opportunityId: null, resourceId: 'res-1' })]);
    await act(async () => getApi().setToken('token-123'));
    await act(async () => Promise.resolve());

    expect(mockedResources.getResource).toHaveBeenCalledWith('token-123', 'res-1');
    expect(getApi().subjectsById['rec-1']).toEqual({ title: 'Chester County Food Bank', description: 'Free groceries weekly.' });
  });

  it('resolves each Pod-linked recommendation to its name and short description, keyed by recommendation id', async () => {
    mockedPods.getPod.mockResolvedValue({
      id: 'pod-1', podRef: null, name: 'Job Seekers Circle', shortDescription: 'Peer support finding stable work.',
      fullDescription: 'x', type: 'INTEREST', status: 'ACTIVE', capacity: 12, primaryLanguage: null,
      city: null, region: null, stateProvince: null, country: null, dormancyThresholdDays: 30,
      parentPodId: null, createdById: 'steward-1', createdAt: 'x', updatedAt: 'x',
    });

    const { getApi } = renderHarness([makeRecommendation({ id: 'rec-1', opportunityId: null, podId: 'pod-1' })]);
    await act(async () => getApi().setToken('token-123'));
    await act(async () => Promise.resolve());

    expect(mockedPods.getPod).toHaveBeenCalledWith('token-123', 'pod-1');
    expect(getApi().subjectsById['rec-1']).toEqual({ title: 'Job Seekers Circle', description: 'Peer support finding stable work.' });
  });
});
