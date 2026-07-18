import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { FounderProvider, useFounder } from './FounderContext';
import * as founderMetricsApi from '../../lib/api/founder-metrics';
import * as aiOperationalConfigApi from '../../lib/api/ai-operational-config';
import * as aiRequestsApi from '../../lib/api/ai-requests';
import * as usersApi from '../../lib/api/users';
import { ApiError } from '../../lib/api/errors';
import type { AdministrationMetricsDto } from '../../lib/api/founder-metrics';
import type { AiOperationalConfigDto } from '../../lib/api/ai-operational-config';
import type { UserDto } from '../../lib/api/users';

jest.mock('../../lib/api/founder-metrics');
jest.mock('../../lib/api/ai-operational-config');
jest.mock('../../lib/api/ai-requests');
jest.mock('../../lib/api/users');

const mockedMetricsApi = founderMetricsApi as jest.Mocked<typeof founderMetricsApi>;
const mockedAiConfigApi = aiOperationalConfigApi as jest.Mocked<typeof aiOperationalConfigApi>;
const mockedAiRequestsApi = aiRequestsApi as jest.Mocked<typeof aiRequestsApi>;
const mockedUsersApi = usersApi as jest.Mocked<typeof usersApi>;

const NOW = '2026-01-01T00:00:00Z';

function makeMetrics(o: Partial<AdministrationMetricsDto> = {}): AdministrationMetricsDto {
  return {
    totalUsers: 10,
    usersByRole: [{ role: 'MEMBER', count: 10 }],
    usersByStatus: [{ status: 'ACTIVE', count: 10 }],
    pendingVerification: { resources: 0, organizations: 0, opportunities: 0, knowledgeArticles: 0, courses: 0, total: 0 },
    openEscalations: 0,
    aiSpend: { totalCostUsd: 0, requestCount: 0, failedCount: 0, globalDailyBudgetUsd: 50, emergencyStop: false },
    aiSpendByCapability: [],
    orchestrationRunsToday: 0,
    orchestrationRunsByGoal: [],
    databaseHealthy: true,
    generatedAt: NOW,
    ...o,
  };
}

function makeAiConfig(o: Partial<AiOperationalConfigDto> = {}): AiOperationalConfigDto {
  return { emergencyStop: false, globalDailyBudgetUsd: 50, userDailyBudgetUsd: 2, updatedById: null, updatedAt: NOW, ...o };
}

function makeUser(o: Partial<UserDto> = {}): UserDto {
  return {
    id: 'user-1', email: 'user@example.com', emailVerified: true, roles: ['MEMBER'], status: 'ACTIVE',
    createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
  };
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useFounder> & { setToken: (t: string | null) => void }) => void }) {
  const founder = useFounder();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...founder,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'admin-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [founder, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useFounder> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <FounderProvider>
        <Harness onReady={(value) => (api = value)} />
      </FounderProvider>
    </SessionProvider>,
  );
  return () => api;
}

describe('FounderContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads institutional health metrics', async () => {
    mockedMetricsApi.getFounderMetrics.mockResolvedValue(makeMetrics({ totalUsers: 42 }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadMetrics());

    expect(mockedMetricsApi.getFounderMetrics).toHaveBeenCalledWith('token-123');
    expect(getApi().state.metrics?.totalUsers).toBe(42);
  });

  it('loads and saves the AI operational config', async () => {
    mockedAiConfigApi.getAiOperationalConfig.mockResolvedValue(makeAiConfig());
    mockedAiConfigApi.updateAiOperationalConfig.mockResolvedValue(makeAiConfig({ emergencyStop: true }));

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadAiConfig());
    expect(getApi().state.aiConfig?.emergencyStop).toBe(false);

    await act(async () => getApi().saveAiConfig({ emergencyStop: true }));
    expect(mockedAiConfigApi.updateAiOperationalConfig).toHaveBeenCalledWith('token-123', { emergencyStop: true });
    expect(getApi().state.aiConfig?.emergencyStop).toBe(true);
    expect(getApi().state.isSavingAiConfig).toBe(false);
  });

  it('loads the platform-wide AI spend summary and request audit log', async () => {
    mockedAiRequestsApi.getAiSpendSummary.mockResolvedValue({
      totalCostUsd: 5, requestCount: 20, failedCount: 1, globalDailyBudgetUsd: 50, emergencyStop: false,
    });
    mockedAiRequestsApi.listAllAiRequests.mockResolvedValue({
      data: [], total: 20, page: 1, limit: 20, totalPages: 1,
    });

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadAiSpendSummary());
    await act(async () => getApi().loadAiRequests({ limit: 20 }));

    expect(getApi().state.aiSpend?.totalCostUsd).toBe(5);
    expect(mockedAiRequestsApi.listAllAiRequests).toHaveBeenCalledWith('token-123', { limit: 20 });
    expect(getApi().state.aiRequestsTotal).toBe(20);
  });

  it('loads users and applies a role grant to the matching entry', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({ data: [makeUser({ id: 'user-1' })], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedUsersApi.grantRole.mockResolvedValue(makeUser({ id: 'user-1', roles: ['MEMBER', 'STEWARD'] }));

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadUsers());
    await act(async () => getApi().grantRole('user-1', 'STEWARD'));

    expect(mockedUsersApi.grantRole).toHaveBeenCalledWith('token-123', 'user-1', 'STEWARD');
    expect(getApi().state.users[0].roles).toEqual(['MEMBER', 'STEWARD']);
    expect(getApi().state.updatingUserId).toBeNull();
  });

  it('requires authentication before loading and never calls the API unauthenticated', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().loadMetrics());
    expect(mockedMetricsApi.getFounderMetrics).not.toHaveBeenCalled();
  });

  it('classifies a 403 as an authorization error distinct from authentication, and clears it on request', async () => {
    mockedMetricsApi.getFounderMetrics.mockRejectedValue(new ApiError(403, 'Founder access required'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadMetrics());

    expect(getApi().state.error?.kind).toBe('authorization');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });
});
