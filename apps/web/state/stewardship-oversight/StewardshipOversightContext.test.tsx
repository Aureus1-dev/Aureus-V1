import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { StewardshipOversightProvider, useStewardshipOversight } from './StewardshipOversightContext';
import * as usersApi from '../../lib/api/users';
import * as stewardshipApi from '../../lib/api/stewardship';
import { ApiError } from '../../lib/api/errors';
import type { UserDto } from '../../lib/api/users';
import type { StewardMetricsDto, StewardshipRelationshipDto } from '../../lib/api/stewardship';

jest.mock('../../lib/api/users');
jest.mock('../../lib/api/stewardship');

const mockedUsersApi = usersApi as jest.Mocked<typeof usersApi>;
const mockedStewardshipApi = stewardshipApi as jest.Mocked<typeof stewardshipApi>;

const NOW = '2026-01-01T00:00:00Z';

function makeSteward(o: Partial<UserDto> = {}): UserDto {
  return {
    id: 'steward-1', email: 'steward@example.com', emailVerified: true, roles: ['STEWARD'], status: 'ACTIVE',
    createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
  };
}

function makeMetrics(o: Partial<StewardMetricsDto> = {}): StewardMetricsDto {
  return {
    stewardId: 'steward-1', activeMemberCount: 5, capacity: 25, tasksCompleted: 3, escalationsResolved: 1,
    memberGoalCompletionRate: 50, averageJourneyProgress: 40, averageResponseTimeHours: null,
    memberSatisfactionScore: null, generatedAt: NOW, ...o,
  };
}

function makeRelationship(o: Partial<StewardshipRelationshipDto> = {}): StewardshipRelationshipDto {
  return {
    id: 'rel-1', memberId: 'member-1', stewardId: 'steward-1', status: 'ACTIVE', origin: 'ADMIN_ASSIGNMENT',
    requestedById: null, assignedById: 'admin-1', assignedByOrganizationId: null, recommendedById: null,
    endReason: null, endedById: null, endedAt: null, activatedAt: NOW, createdAt: NOW, updatedAt: NOW, ...o,
  };
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useStewardshipOversight> & { setToken: (t: string | null) => void }) => void }) {
  const oversight = useStewardshipOversight();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...oversight,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'admin-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oversight, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useStewardshipOversight> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <StewardshipOversightProvider>
        <Harness onReady={(value) => (api = value)} />
      </StewardshipOversightProvider>
    </SessionProvider>,
  );
  return () => api;
}

describe('StewardshipOversightContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the steward roster, each steward\'s metrics, and the relationship roster together', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({ data: [makeSteward()], total: 1, page: 1, limit: 100, totalPages: 1 });
    mockedStewardshipApi.listStewardshipRelationships.mockResolvedValue({
      data: [makeRelationship()], total: 1, page: 1, limit: 100, totalPages: 1,
    });
    mockedStewardshipApi.getStewardMetrics.mockResolvedValue(makeMetrics());

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(mockedUsersApi.listUsers).toHaveBeenCalledWith('token-123', { role: 'STEWARD', limit: 100 });
    expect(mockedStewardshipApi.getStewardMetrics).toHaveBeenCalledWith('token-123', 'steward-1');
    expect(getApi().state.stewards).toHaveLength(1);
    expect(getApi().state.metricsByStewardId['steward-1'].activeMemberCount).toBe(5);
    expect(getApi().state.relationships).toHaveLength(1);
    expect(getApi().state.relationshipsTotal).toBe(1);
  });

  it('requires authentication before loading and never calls the API unauthenticated', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().load());
    expect(mockedUsersApi.listUsers).not.toHaveBeenCalled();
  });

  it('classifies a 403 as an authorization error distinct from authentication, and clears it on request', async () => {
    mockedUsersApi.listUsers.mockRejectedValue(new ApiError(403, 'Founder access required'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(getApi().state.error?.kind).toBe('authorization');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });
});
