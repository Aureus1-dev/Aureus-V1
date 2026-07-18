import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { FounderProvider } from '../../../state/founder/FounderContext';
import { AiOperationalControlsPanel } from './AiOperationalControlsPanel';

import * as aiOperationalConfigApi from '../../../lib/api/ai-operational-config';
import * as aiRequestsApi from '../../../lib/api/ai-requests';
import * as founderMetricsApi from '../../../lib/api/founder-metrics';
import type { AiOperationalConfigDto } from '../../../lib/api/ai-operational-config';
import type { AiRequestDto } from '../../../lib/api/ai-requests';
import type { AdministrationMetricsDto } from '../../../lib/api/founder-metrics';

jest.mock('../../../lib/api/founder-metrics');
jest.mock('../../../lib/api/ai-operational-config');
jest.mock('../../../lib/api/ai-requests');
jest.mock('../../../lib/api/users');

const mockedAiConfigApi = aiOperationalConfigApi as jest.Mocked<typeof aiOperationalConfigApi>;
const mockedAiRequestsApi = aiRequestsApi as jest.Mocked<typeof aiRequestsApi>;
const mockedMetricsApi = founderMetricsApi as jest.Mocked<typeof founderMetricsApi>;

const NOW = '2026-01-01T00:00:00Z';

function makeAiConfig(o: Partial<AiOperationalConfigDto> = {}): AiOperationalConfigDto {
  return { emergencyStop: false, globalDailyBudgetUsd: 50, userDailyBudgetUsd: 2, updatedById: null, updatedAt: NOW, ...o };
}

function makeRequest(o: Partial<AiRequestDto> = {}): AiRequestDto {
  return {
    id: 'req-1', userId: 'user-1', conversationId: null, capability: 'QUESTION_ANSWERING', provider: 'STUB',
    model: 'stub', promptTokens: 10, completionTokens: 5, costUsd: 0.0012, latencyMs: 12, status: 'SUCCESS',
    errorMessage: null, createdAt: NOW, ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'admin-1', email: 'admin@example.com' });
  }
  return <>{children}</>;
}

function renderPanel() {
  return render(
    <SessionProvider>
      <FounderProvider>
        <SignedInAs>
          <AiOperationalControlsPanel />
        </SignedInAs>
      </FounderProvider>
    </SessionProvider>,
  );
}

function makeMetrics(o: Partial<AdministrationMetricsDto> = {}): AdministrationMetricsDto {
  return {
    totalUsers: 1,
    usersByRole: [], usersByStatus: [],
    pendingVerification: { resources: 0, organizations: 0, opportunities: 0, knowledgeArticles: 0, courses: 0, total: 0 },
    openEscalations: 0,
    aiSpend: { totalCostUsd: 3.5, requestCount: 10, failedCount: 1, globalDailyBudgetUsd: 50, emergencyStop: false },
    aiSpendByCapability: [{ capability: 'RECOMMENDATION', totalCostUsd: 3.5, requestCount: 10, failedCount: 1 }],
    orchestrationRunsToday: 4,
    orchestrationRunsByGoal: [{ goal: 'NEXT_BEST_ACTION', count: 4 }],
    databaseHealthy: true,
    generatedAt: NOW,
    ...o,
  };
}

function mockDefaults() {
  mockedAiConfigApi.getAiOperationalConfig.mockResolvedValue(makeAiConfig());
  mockedAiRequestsApi.getAiSpendSummary.mockResolvedValue({
    totalCostUsd: 3.5, requestCount: 10, failedCount: 1, globalDailyBudgetUsd: 50, emergencyStop: false,
  });
  mockedAiRequestsApi.listAllAiRequests.mockResolvedValue({
    data: [makeRequest()], total: 1, page: 1, limit: 20, totalPages: 1,
  });
  mockedMetricsApi.getFounderMetrics.mockResolvedValue(makeMetrics());
}

describe('AiOperationalControlsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the live config, spend summary, and audit log once loaded', async () => {
    mockDefaults();
    renderPanel();

    expect(await screen.findByDisplayValue('50')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByText('$3.50 / $50.00')).toBeInTheDocument();
    expect(screen.getByText('QUESTION_ANSWERING')).toBeInTheDocument();
  });

  it('shows the AI spend-by-capability breakdown and orchestration routing activity once loaded', async () => {
    mockDefaults();
    renderPanel();

    expect(await screen.findByText('Spend by capability (rolling 24h)')).toBeInTheDocument();
    expect(screen.getByText('$3.5000')).toBeInTheDocument();
    expect(screen.getByText('Orchestration activity (rolling 24h)')).toBeInTheDocument();
    expect(screen.getByText('4 runs')).toBeInTheDocument();
    expect(screen.getByText('NEXT_BEST_ACTION')).toBeInTheDocument();
  });

  it('saves an updated budget ceiling', async () => {
    mockDefaults();
    mockedAiConfigApi.updateAiOperationalConfig.mockResolvedValue(makeAiConfig({ globalDailyBudgetUsd: 100 }));
    const user = userEvent.setup();

    renderPanel();
    const input = await screen.findByLabelText('Platform-wide daily AI budget (USD)');
    fireEvent.change(input, { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: 'Save controls' }));

    await waitFor(() =>
      expect(mockedAiConfigApi.updateAiOperationalConfig).toHaveBeenCalledWith('token-123', {
        emergencyStop: false, globalDailyBudgetUsd: 100, userDailyBudgetUsd: 2,
      }),
    );
  });

  it('toggling the emergency stop checkbox and saving sends emergencyStop: true', async () => {
    mockDefaults();
    mockedAiConfigApi.updateAiOperationalConfig.mockResolvedValue(makeAiConfig({ emergencyStop: true }));
    const user = userEvent.setup();

    renderPanel();
    await screen.findByDisplayValue('50');
    await user.click(screen.getByRole('checkbox', { name: /Emergency stop/ }));
    await user.click(screen.getByRole('button', { name: 'Save controls' }));

    await waitFor(() =>
      expect(mockedAiConfigApi.updateAiOperationalConfig).toHaveBeenCalledWith(
        'token-123',
        expect.objectContaining({ emergencyStop: true }),
      ),
    );
  });

  it('shows a retryable error state when the config fails to load', async () => {
    mockedAiConfigApi.getAiOperationalConfig.mockRejectedValue(new Error('boom'));
    mockedAiRequestsApi.getAiSpendSummary.mockResolvedValue({
      totalCostUsd: 0, requestCount: 0, failedCount: 0, globalDailyBudgetUsd: 50, emergencyStop: false,
    });
    mockedAiRequestsApi.listAllAiRequests.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    renderPanel();

    expect(await screen.findByText("AI operational controls couldn't be loaded")).toBeInTheDocument();
  });

  it('has no accessibility violations once fully loaded', async () => {
    mockDefaults();
    const { container } = renderPanel();
    await screen.findByDisplayValue('50');
    expect(await axe(container)).toHaveNoViolations();
  });
});
