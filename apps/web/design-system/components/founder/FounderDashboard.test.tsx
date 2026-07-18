import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { FounderProvider } from '../../../state/founder/FounderContext';
import { FounderDashboard } from './FounderDashboard';

import * as founderMetricsApi from '../../../lib/api/founder-metrics';
import type { AdministrationMetricsDto } from '../../../lib/api/founder-metrics';

jest.mock('../../../lib/api/founder-metrics');
jest.mock('../../../lib/api/ai-operational-config');
jest.mock('../../../lib/api/ai-requests');
jest.mock('../../../lib/api/users');

const mockedMetricsApi = founderMetricsApi as jest.Mocked<typeof founderMetricsApi>;

const NOW = '2026-01-01T00:00:00Z';

function makeMetrics(o: Partial<AdministrationMetricsDto> = {}): AdministrationMetricsDto {
  return {
    totalUsers: 128,
    usersByRole: [{ role: 'MEMBER', count: 120 }, { role: 'STEWARD', count: 8 }],
    usersByStatus: [{ status: 'ACTIVE', count: 125 }, { status: 'SUSPENDED', count: 3 }],
    pendingVerification: { resources: 2, organizations: 1, opportunities: 0, knowledgeArticles: 3, courses: 1, total: 7 },
    openEscalations: 4,
    aiSpend: { totalCostUsd: 12.34, requestCount: 88, failedCount: 2, globalDailyBudgetUsd: 50, emergencyStop: false },
    databaseHealthy: true,
    generatedAt: NOW,
    ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'admin-1', email: 'admin@example.com' });
  }
  return <>{children}</>;
}

function renderDashboard() {
  return render(
    <SessionProvider>
      <FounderProvider>
        <SignedInAs>
          <FounderDashboard />
        </SignedInAs>
      </FounderProvider>
    </SessionProvider>,
  );
}

describe('FounderDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the institutional health tiles once metrics load', async () => {
    mockedMetricsApi.getFounderMetrics.mockResolvedValue(makeMetrics());

    renderDashboard();

    expect(await screen.findByText('128')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('$12.34 / $50.00')).toBeInTheDocument();
    expect(screen.getByText('Database reachable')).toBeInTheDocument();
  });

  it('shows the emergency stop badge instead of request counts when the emergency stop is active', async () => {
    mockedMetricsApi.getFounderMetrics.mockResolvedValue(
      makeMetrics({ aiSpend: { totalCostUsd: 0, requestCount: 0, failedCount: 0, globalDailyBudgetUsd: 50, emergencyStop: true } }),
    );

    renderDashboard();

    expect(await screen.findByText('Emergency stop active')).toBeInTheDocument();
  });

  it('links each tile to its Founder panel', async () => {
    mockedMetricsApi.getFounderMetrics.mockResolvedValue(makeMetrics());

    renderDashboard();
    await screen.findByText('128');

    expect(screen.getByRole('link', { name: /Members/ })).toHaveAttribute('href', '/founder/users');
    expect(screen.getByRole('link', { name: /Pending review/ })).toHaveAttribute('href', '/founder/review');
    expect(screen.getByRole('link', { name: /Open escalations/ })).toHaveAttribute('href', '/founder/stewardship');
    expect(screen.getByRole('link', { name: /AI spend/ })).toHaveAttribute('href', '/founder/ai');
    expect(screen.getByRole('link', { name: /Announcements/ })).toHaveAttribute('href', '/founder/announcements');
    expect(screen.getByRole('link', { name: /Governance/ })).toHaveAttribute('href', '/founder/governance');
  });

  it('shows a retryable error state when metrics fail to load', async () => {
    mockedMetricsApi.getFounderMetrics.mockRejectedValue(new Error('boom'));

    renderDashboard();

    expect(await screen.findByText("Institutional health metrics couldn't be loaded")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('has no accessibility violations on the fully populated dashboard', async () => {
    mockedMetricsApi.getFounderMetrics.mockResolvedValue(makeMetrics());
    const { container } = renderDashboard();
    await screen.findByText('128');
    expect(await axe(container)).toHaveNoViolations();
  });
});
